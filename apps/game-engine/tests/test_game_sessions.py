"""game_sessions 라우트 테스트 (game-engine-api v2 §3-3 ~ §3-6).

routes:
- POST /api/v1/game-sessions
- POST /api/v1/game-sessions/{id}/move
- GET  /api/v1/game-sessions/{id}
- POST /api/v1/game-sessions/{id}/undo
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI

from app.core.auth import get_current_user
from app.models.game_session import GameSession
from app.models.play_log import PlayLog
from app.models.scenario import Scenario
from app.models.user_scenario_progress import UserScenarioProgress
from tests.fixtures.regression_scenario import (
    REGRESSION_SCENARIO_ID,
    build_regression_scenario,
)


@pytest_asyncio.fixture
async def _seeded_scenario(test_db) -> Scenario:
    s = build_regression_scenario()
    await s.insert()
    return s


# -------- POST /game-sessions --------


async def test_create_session_returns_201_with_root_node(
    client: httpx.AsyncClient, _seeded_scenario
):
    res = await client.post(
        "/api/v1/game-sessions",
        json={"scenario_id": REGRESSION_SCENARIO_ID},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["scenario_id"] == REGRESSION_SCENARIO_ID
    assert body["user_id"] == 42
    assert body["current_node_id"] == "n0"
    assert body["current_node"]["id"] == "n0"
    assert body["current_node"]["type"] == "narrative"
    assert body["resources"] == {"trust": 3, "money": 3, "awareness": 1}
    assert body["status"] == "playing"
    assert body["dangerous_count"] == 0
    assert body["choices_history"] == []
    assert "session_id" in body
    assert body["completed_at"] is None


async def test_create_session_scenario_not_found(client: httpx.AsyncClient, test_db):
    res = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": "does_not_exist"}
    )
    assert res.status_code == 404
    assert res.json() == {"detail": "Scenario not found"}


async def test_create_session_resumes_existing_active_session(
    client: httpx.AsyncClient, _seeded_scenario
):
    """동일 user×scenario 활성 세션이 있으면 그것을 resume (idempotent)."""
    res1 = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    assert res1.status_code == 201
    first_session_id = res1.json()["session_id"]

    res2 = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    # idempotent: 새 세션 생성하지 않고 기존 세션을 200으로 반환
    assert res2.status_code in (200, 201)
    assert res2.json()["session_id"] == first_session_id
    assert res2.json()["status"] == "playing"


async def test_create_session_different_scenario_no_conflict(
    client: httpx.AsyncClient, _seeded_scenario, test_db
):
    """다른 scenario_id 로는 활성 세션 추가 가능 (v2 §2-6)."""
    # 추가 시나리오 시드
    sc2 = build_regression_scenario()
    sc2.scenario_id = "regression_scenario_2"
    await sc2.insert()

    res1 = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    assert res1.status_code == 201

    res2 = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": "regression_scenario_2"}
    )
    assert res2.status_code == 201


# -------- POST /game-sessions/{id}/move --------


async def test_move_safe_step_updates_resources_and_history(
    client: httpx.AsyncClient, _seeded_scenario
):
    create_res = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    sid = create_res.json()["session_id"]

    res = await client.post(
        f"/api/v1/game-sessions/{sid}/move", json={"choice_id": "n0_c1"}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["current_node_id"] == "n1"
    assert body["resources"] == {"trust": 3, "money": 3, "awareness": 2}
    assert body["dangerous_count"] == 0
    assert len(body["choices_history"]) == 1
    h = body["choices_history"][0]
    assert set(h.keys()) == {"node_id", "choice_id", "is_dangerous", "timestamp"}
    assert h["node_id"] == "n0"
    assert h["choice_id"] == "n0_c1"
    assert h["is_dangerous"] is False
    assert body["danger_feedback"] is None
    assert body["educational_content"] is None
    assert body["is_finished"] is False
    assert body["ending_type"] is None


async def test_move_dangerous_step_returns_feedback_objects(
    client: httpx.AsyncClient, _seeded_scenario
):
    create_res = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    sid = create_res.json()["session_id"]

    res = await client.post(
        f"/api/v1/game-sessions/{sid}/move", json={"choice_id": "n0_c2"}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["dangerous_count"] == 1
    assert body["resources"]["trust"] == 2
    assert body["resources"]["money"] == 1
    # danger_feedback 객체 (scenario-tree v2 §4-1) 3-field
    df = body["danger_feedback"]
    assert df is not None
    assert set(df.keys()) == {"why_dangerous", "warning_signs", "safe_alternative"}
    # educational_content 객체 4-field
    ec = body["educational_content"]
    assert ec is not None
    assert set(ec.keys()) == {
        "title",
        "explanation",
        "prevention_tips",
        "warning_signs",
    }


async def test_move_reaching_ending_finalizes_session_and_records_log_progress(
    client: httpx.AsyncClient, _seeded_scenario
):
    create_res = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    sid = create_res.json()["session_id"]

    # n0_c1 → n1
    await client.post(
        f"/api/v1/game-sessions/{sid}/move", json={"choice_id": "n0_c1"}
    )
    # n1_c1 → n_end_good
    res = await client.post(
        f"/api/v1/game-sessions/{sid}/move", json={"choice_id": "n1_c1"}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["is_finished"] is True
    assert body["ending_type"] == "ending_good"
    assert body["status"] == "completed"
    assert body["completed_at"] is not None
    assert body["current_node_id"] == "n_end_good"

    # PlayLog 1건 생성
    logs = await PlayLog.find(PlayLog.user_id == 42).to_list()
    assert len(logs) == 1
    assert logs[0].scenario_id == REGRESSION_SCENARIO_ID
    assert logs[0].ending_type == "ending_good"
    assert logs[0].final_node_id == "n_end_good"
    assert logs[0].total_choices == 2

    # UserScenarioProgress upsert
    progress = await UserScenarioProgress.find_one(
        UserScenarioProgress.user_id == 42,
        UserScenarioProgress.scenario_id == REGRESSION_SCENARIO_ID,
    )
    assert progress is not None
    assert progress.discovered_endings == ["n_end_good"]
    assert progress.play_count == 1
    assert progress.total_endings == 2  # scenario.total_endings
    assert progress.completion_rate == 0.5


async def test_move_invalid_choice_id_returns_400(
    client: httpx.AsyncClient, _seeded_scenario
):
    create_res = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    sid = create_res.json()["session_id"]

    res = await client.post(
        f"/api/v1/game-sessions/{sid}/move", json={"choice_id": "bogus"}
    )
    assert res.status_code == 400
    assert "Invalid choice_id" in res.json()["detail"]


async def test_move_after_completion_returns_400(
    client: httpx.AsyncClient, _seeded_scenario
):
    create_res = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    sid = create_res.json()["session_id"]
    await client.post(
        f"/api/v1/game-sessions/{sid}/move", json={"choice_id": "n0_c1"}
    )
    await client.post(
        f"/api/v1/game-sessions/{sid}/move", json={"choice_id": "n1_c1"}
    )

    # 이미 completed
    res = await client.post(
        f"/api/v1/game-sessions/{sid}/move", json={"choice_id": "n0_c1"}
    )
    assert res.status_code == 400
    assert res.json() == {"detail": "Session is not active"}


async def test_move_session_not_found(client: httpx.AsyncClient, _seeded_scenario):
    res = await client.post(
        "/api/v1/game-sessions/non_existing_id/move",
        json={"choice_id": "n0_c1"},
    )
    assert res.status_code == 404


# -------- GET /game-sessions/{id} --------


async def test_get_session_returns_current_node(
    client: httpx.AsyncClient, _seeded_scenario
):
    create_res = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    sid = create_res.json()["session_id"]

    res = await client.get(f"/api/v1/game-sessions/{sid}")
    assert res.status_code == 200
    body = res.json()
    assert body["current_node_id"] == "n0"
    assert body["current_node"]["id"] == "n0"
    # GET 응답은 danger_feedback/educational_content 항상 null
    assert body["danger_feedback"] is None
    assert body["educational_content"] is None
    assert body["is_finished"] is False


async def test_get_session_not_found(client: httpx.AsyncClient, test_db):
    res = await client.get("/api/v1/game-sessions/non_existing")
    assert res.status_code == 404
    assert res.json() == {"detail": "Session not found"}


async def test_get_session_other_user_returns_404(
    app_for_routes: FastAPI, _seeded_scenario
):
    """다른 user_id 접근은 정보 노출 방지로 404."""
    # user 42 로 생성
    app_for_routes.dependency_overrides[get_current_user] = lambda: {
        "user_id": 42,
        "role": "USER",
        "payload": {"sub": "42", "role": "USER"},
    }
    transport = httpx.ASGITransport(app=app_for_routes)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        create_res = await c.post(
            "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
        )
        sid = create_res.json()["session_id"]

    # user 99 로 조회
    app_for_routes.dependency_overrides[get_current_user] = lambda: {
        "user_id": 99,
        "role": "USER",
        "payload": {"sub": "99", "role": "USER"},
    }
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c2:
        res = await c2.get(f"/api/v1/game-sessions/{sid}")
    assert res.status_code == 404


# -------- POST /game-sessions/{id}/undo --------


async def test_undo_returns_to_previous_state(
    client: httpx.AsyncClient, _seeded_scenario
):
    create_res = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    sid = create_res.json()["session_id"]
    await client.post(
        f"/api/v1/game-sessions/{sid}/move", json={"choice_id": "n0_c1"}
    )
    res = await client.post(f"/api/v1/game-sessions/{sid}/undo")
    assert res.status_code == 200
    body = res.json()
    assert body["current_node_id"] == "n0"
    assert body["resources"] == {"trust": 3, "money": 3, "awareness": 1}
    assert body["choices_history"] == []
    assert body["dangerous_count"] == 0
    assert body["status"] == "playing"


async def test_undo_empty_history_returns_400(
    client: httpx.AsyncClient, _seeded_scenario
):
    create_res = await client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    sid = create_res.json()["session_id"]
    res = await client.post(f"/api/v1/game-sessions/{sid}/undo")
    assert res.status_code == 400
    assert res.json() == {"detail": "No choices to undo"}


# -------- Auth --------


async def test_unauth_create_session_returns_401_or_403(
    unauth_client: httpx.AsyncClient, _seeded_scenario
):
    res = await unauth_client.post(
        "/api/v1/game-sessions", json={"scenario_id": REGRESSION_SCENARIO_ID}
    )
    assert res.status_code in (401, 403)
