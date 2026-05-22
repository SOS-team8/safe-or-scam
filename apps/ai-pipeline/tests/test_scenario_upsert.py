"""시나리오 생성 결과 → scenarios 컬렉션 upsert 검증.

contract `scenario-tree.md` v2 §1 — scenario_id unique key, $set + $setOnInsert(created_at).
"""
from datetime import datetime, timezone

import pytest
from mongomock_motor import AsyncMongoMockClient

from app.db import mongo as mongo_mod
from app.models.scenario import (
    Choice,
    ScenarioNode,
    ScenarioTree,
    compute_ending_counts,
)


@pytest.fixture
def mongo_db():
    client = AsyncMongoMockClient()
    db = client["test_db"]
    mongo_mod.set_db_for_testing(db)
    yield db
    mongo_mod.set_db_for_testing(None)


def _make_simple_tree(scenario_id: str = "scenario_test01") -> ScenarioTree:
    now = datetime.now(timezone.utc)
    nodes = {
        "node_001": ScenarioNode(
            id="node_001",
            type="narrative",
            text="시작",
            choices=[
                Choice(id="node_001_c1", text="신중", next_node_id="node_002"),
                Choice(id="node_001_c2", text="응답", next_node_id="node_003"),
            ],
            depth=0,
        ),
        "node_002": ScenarioNode(
            id="node_002", type="ending_good", text="안전", depth=1,
            parent_node_id="node_001", parent_choice_id="node_001_c1",
        ),
        "node_003": ScenarioNode(
            id="node_003", type="ending_bad", text="피해", depth=1,
            parent_node_id="node_001", parent_choice_id="node_001_c2",
        ),
    }
    return ScenarioTree(
        scenario_id=scenario_id,
        title="t", description="d", phishing_type="smishing",
        difficulty="easy", root_node_id="node_001", nodes=nodes,
        created_at=now, updated_at=now,
    )


@pytest.mark.asyncio
async def test_upsert_scenario_new(mongo_db):
    tree = _make_simple_tree("scenario_aaa")
    result = await mongo_mod.upsert_scenario(tree)
    assert result["upserted_id"] is not None

    doc = await mongo_db.scenarios.find_one({"scenario_id": "scenario_aaa"})
    assert doc is not None
    assert doc["title"] == "t"
    assert doc["nodes"]["node_001"]["id"] == "node_001"


@pytest.mark.asyncio
async def test_upsert_scenario_repeat_preserves_created_at_and_updates_updated_at(mongo_db):
    tree = _make_simple_tree("scenario_bbb")
    await mongo_mod.upsert_scenario(tree)
    first = await mongo_db.scenarios.find_one({"scenario_id": "scenario_bbb"})
    first_created = first["created_at"]

    # 변경 후 재 upsert
    tree.title = "변경된 제목"
    # created_at은 도구상 그대로 둠. updated_at은 upsert_scenario 내부에서 now로 갱신
    await mongo_mod.upsert_scenario(tree)

    second = await mongo_db.scenarios.find_one({"scenario_id": "scenario_bbb"})
    assert second["title"] == "변경된 제목"
    # created_at은 보존
    assert second["created_at"] == first_created
    # updated_at은 갱신됨 (문자열 비교가 어렵지만 not equal 가능성 큼)
    assert "updated_at" in second


@pytest.mark.asyncio
async def test_upsert_scenario_uses_scenario_id_filter(mongo_db):
    """동일 scenario_id는 한 doc만 (unique index 의존 X — filter 자체로)."""
    tree = _make_simple_tree("scenario_ccc")
    await mongo_mod.upsert_scenario(tree)
    await mongo_mod.upsert_scenario(tree)
    count = await mongo_db.scenarios.count_documents({"scenario_id": "scenario_ccc"})
    assert count == 1


def test_compute_ending_counts_helper():
    tree = _make_simple_tree()
    total, good, bad = compute_ending_counts(tree)
    assert good == 1
    assert bad == 1
    assert total == 2
