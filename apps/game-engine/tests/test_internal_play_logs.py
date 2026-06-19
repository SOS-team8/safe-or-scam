"""internal play-logs 엔드포인트 — 목록 / 결말 상세.

auth(X-Internal-Api-Key)는 test_internal_auth.py 가 책임 → 여기선 verify_internal_api_key 를
override 하고 로직(소유 404 / 빈목록 / 카테고리 None / 정렬)만 검증한다.
internal 라우터는 conftest 의 app_for_routes 에 없어 전용 app·client fixture 를 둔다.
"""
from __future__ import annotations

from datetime import datetime, timezone

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI

from app.api.routes import internal as internal_routes
from app.core.internal_auth import verify_internal_api_key
from app.models.common import EndingCategory, Resources, ScenarioNode
from app.models.play_log import PlayLog
from app.models.scenario import Scenario


@pytest.fixture
def internal_app(test_db) -> FastAPI:
    app = FastAPI()
    app.include_router(internal_routes.router, prefix="/api/internal")
    app.dependency_overrides[verify_internal_api_key] = lambda: None
    return app


@pytest_asyncio.fixture
async def internal_client(internal_app: FastAPI):
    transport = httpx.ASGITransport(app=internal_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    internal_app.dependency_overrides.clear()


# ---- 시드 헬퍼 ----

async def _seed_play_log(
    *,
    log_id: str,
    user_id: int,
    scenario_id: str,
    completed_at: datetime,
    final_node_id: str = "end_bad_1",
    ending_type: str = "ending_bad",
) -> None:
    await PlayLog(
        log_id=log_id,
        scenario_id=scenario_id,
        user_id=user_id,
        path=[0],
        final_node_id=final_node_id,
        ending_type=ending_type,
        final_resource=Resources(trust=1, money=2, awareness=3),
        total_score=42,
        dangerous_count=1,
        total_choices=3,
        phishing_type="smishing",
        duration_seconds=120,
        completed_at=completed_at,
    ).insert()


async def _seed_scenario(
    *,
    scenario_id: str,
    final_node_id: str = "end_bad_1",
    with_category: bool = True,
) -> None:
    node = ScenarioNode(
        id=final_node_id,
        type="ending_bad",
        text="결말 서술 텍스트",
        image_url="https://img/ending.png",
        ending_category="cat_loss" if with_category else None,
    )
    cats = (
        {
            "cat_loss": EndingCategory(
                category_id="cat_loss",
                label="피해 발생",
                description="자산을 잃었습니다",
                node_ids=[final_node_id],
            )
        }
        if with_category
        else None
    )
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    await Scenario(
        scenario_id=scenario_id,
        title="t",
        description="d",
        phishing_type="smishing",
        difficulty="easy",
        root_node_id="root",
        nodes={final_node_id: node},
        total_endings=1,
        total_good_endings=0,
        total_bad_endings=1,
        ending_categories=cats,
        created_at=now,
        updated_at=now,
    ).insert()


# ---- 목록 ----

async def test_empty_returns_200_empty_list(internal_client, test_db):
    resp = await internal_client.get(
        "/api/internal/play-logs/user/42", params={"scenario_id": "s_none"}
    )
    assert resp.status_code == 200
    assert resp.json() == []


async def test_lists_own_scenario_plays_completed_desc(internal_client, test_db):
    await _seed_play_log(log_id="log_old", user_id=42, scenario_id="s_1", completed_at=datetime(2026, 1, 1, tzinfo=timezone.utc))
    await _seed_play_log(log_id="log_new", user_id=42, scenario_id="s_1", completed_at=datetime(2026, 3, 1, tzinfo=timezone.utc))
    await _seed_play_log(log_id="log_other_user", user_id=99, scenario_id="s_1", completed_at=datetime(2026, 2, 1, tzinfo=timezone.utc))
    await _seed_play_log(log_id="log_other_scn", user_id=42, scenario_id="s_2", completed_at=datetime(2026, 2, 1, tzinfo=timezone.utc))

    resp = await internal_client.get(
        "/api/internal/play-logs/user/42", params={"scenario_id": "s_1"}
    )
    assert resp.status_code == 200
    body = resp.json()
    # 타 유저·타 시나리오 제외, completed_at desc
    assert [r["log_id"] for r in body] == ["log_new", "log_old"]
    assert body[0]["ending_type"] == "ending_bad"
    assert body[0]["total_score"] == 42


# ---- 상세 ----

async def test_returns_ending_content_with_category(internal_client, test_db):
    await _seed_scenario(scenario_id="s_1", with_category=True)
    await _seed_play_log(log_id="log_1", user_id=42, scenario_id="s_1",
                         completed_at=datetime(2026, 1, 1, tzinfo=timezone.utc))

    resp = await internal_client.get(
        "/api/internal/play-logs/log_1", params={"user_id": 42}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["log_id"] == "log_1"
    assert body["image_url"] == "https://img/ending.png"
    assert body["text"] == "결말 서술 텍스트"
    assert body["ending_category"] == {"label": "피해 발생", "description": "자산을 잃었습니다"}


async def test_other_user_returns_404(internal_client, test_db):
    await _seed_scenario(scenario_id="s_1")
    await _seed_play_log(log_id="log_1", user_id=99, scenario_id="s_1",
                         completed_at=datetime(2026, 1, 1, tzinfo=timezone.utc))

    resp = await internal_client.get(
        "/api/internal/play-logs/log_1", params={"user_id": 42}
    )
    assert resp.status_code == 404


async def test_nonexistent_log_returns_404(internal_client, test_db):
    resp = await internal_client.get(
        "/api/internal/play-logs/nope", params={"user_id": 42}
    )
    assert resp.status_code == 404


async def test_missing_scenario_returns_404(internal_client, test_db):
    # play_log 만 있고 scenario 없음 (하드삭제 시뮬)
    await _seed_play_log(log_id="log_1", user_id=42, scenario_id="s_gone",
                         completed_at=datetime(2026, 1, 1, tzinfo=timezone.utc))

    resp = await internal_client.get(
        "/api/internal/play-logs/log_1", params={"user_id": 42}
    )
    assert resp.status_code == 404


async def test_category_none_omitted(internal_client, test_db):
    await _seed_scenario(scenario_id="s_1", with_category=False)
    await _seed_play_log(log_id="log_1", user_id=42, scenario_id="s_1",
                         completed_at=datetime(2026, 1, 1, tzinfo=timezone.utc))

    resp = await internal_client.get(
        "/api/internal/play-logs/log_1", params={"user_id": 42}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ending_category"] is None
    # 카테고리 없어도 결말 코어는 정상
    assert body["image_url"] == "https://img/ending.png"
    assert body["text"] == "결말 서술 텍스트"