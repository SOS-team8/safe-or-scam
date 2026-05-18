"""scenarios 라우트 테스트 (game-engine-api v2 §3-1, §3-2)."""
from __future__ import annotations

from datetime import UTC, datetime

import httpx

from app.models.common import ScenarioNode
from app.models.scenario import Scenario


async def _insert_scenario(
    *,
    scenario_id: str,
    difficulty: str = "easy",
    phishing_type: str = "smishing",
    total_endings: int = 2,
) -> Scenario:
    s = Scenario(
        scenario_id=scenario_id,
        title=f"{scenario_id} 제목",
        description=f"{scenario_id} 설명",
        phishing_type=phishing_type,
        difficulty=difficulty,
        root_node_id="n0",
        nodes={
            "n0": ScenarioNode(
                id="n0", type="narrative", text="시작", choices=[]
            ),
        },
        total_endings=total_endings,
        total_good_endings=1,
        total_bad_endings=1,
        tags=[],
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await s.insert()
    return s


async def test_list_scenarios_returns_summaries(client: httpx.AsyncClient):
    await _insert_scenario(scenario_id="sc_1", difficulty="easy")
    await _insert_scenario(scenario_id="sc_2", difficulty="hard")

    res = await client.get("/api/v1/scenarios")
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, list)
    assert len(body) == 2
    keys = set(body[0].keys())
    assert keys == {
        "scenario_id",
        "title",
        "description",
        "phishing_type",
        "difficulty",
        "total_endings",
        "total_good_endings",
        "total_bad_endings",
        "tags",
    }
    # nodes 포함 안 됨
    assert "nodes" not in body[0]


async def test_list_scenarios_filter_by_difficulty(client: httpx.AsyncClient):
    await _insert_scenario(scenario_id="sc_a", difficulty="easy")
    await _insert_scenario(scenario_id="sc_b", difficulty="medium")
    await _insert_scenario(scenario_id="sc_c", difficulty="hard")

    res = await client.get("/api/v1/scenarios?difficulty=easy")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["scenario_id"] == "sc_a"


async def test_list_scenarios_filter_by_phishing_type(client: httpx.AsyncClient):
    await _insert_scenario(scenario_id="sc_x", phishing_type="smishing")
    await _insert_scenario(scenario_id="sc_y", phishing_type="voice_phishing")

    res = await client.get("/api/v1/scenarios?phishing_type=voice_phishing")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["scenario_id"] == "sc_y"


async def test_get_scenario_detail_returns_full_tree(client: httpx.AsyncClient):
    await _insert_scenario(scenario_id="sc_detail")

    res = await client.get("/api/v1/scenarios/sc_detail")
    assert res.status_code == 200
    body = res.json()
    # ScenarioTree 전체 필드 (nodes 포함)
    assert body["scenario_id"] == "sc_detail"
    assert body["root_node_id"] == "n0"
    assert "nodes" in body
    assert "n0" in body["nodes"]
    assert body["nodes"]["n0"]["type"] == "narrative"


async def test_get_scenario_not_found(client: httpx.AsyncClient):
    res = await client.get("/api/v1/scenarios/does_not_exist")
    assert res.status_code == 404
    assert res.json() == {"detail": "Scenario not found"}


async def test_list_scenarios_unauthorized(unauth_client: httpx.AsyncClient):
    """Authorization 헤더 없음 → 403 (HTTPBearer auto_error 기본)."""
    res = await unauth_client.get("/api/v1/scenarios")
    assert res.status_code in (401, 403)


async def test_get_scenario_unauthorized(unauth_client: httpx.AsyncClient):
    res = await unauth_client.get("/api/v1/scenarios/anything")
    assert res.status_code in (401, 403)
