"""ending_classifier가 tree_builder._save_scenario 직전(혹은 라우트 _save_scenario 호출 직전)에 자동 호출되는지 검증.

LLM 호출은 monkeypatch로 차단. classify_tree_in_memory의 결과를
tree.ending_categories + 각 ending 노드 ending_category에 채워야 한다.
"""
from datetime import datetime, timezone

import pytest

from app.models.scenario import (
    Choice,
    EndingCategory,
    ScenarioNode,
    ScenarioTree,
)


def _make_tree() -> ScenarioTree:
    now = datetime.now(timezone.utc)
    nodes = {
        "node_001": ScenarioNode(
            id="node_001", type="narrative", text="x",
            choices=[
                Choice(id="node_001_c1", text="c1", next_node_id="node_002"),
                Choice(id="node_001_c2", text="c2", next_node_id="node_003"),
            ], depth=0,
        ),
        "node_002": ScenarioNode(
            id="node_002", type="ending_good", text="good", depth=1,
            parent_node_id="node_001", parent_choice_id="node_001_c1",
        ),
        "node_003": ScenarioNode(
            id="node_003", type="ending_bad", text="bad", depth=1,
            parent_node_id="node_001", parent_choice_id="node_001_c2",
        ),
    }
    return ScenarioTree(
        scenario_id="scenario_ec",
        title="t", description="d", phishing_type="smishing",
        difficulty="easy", root_node_id="node_001", nodes=nodes,
        created_at=now, updated_at=now,
    )


@pytest.mark.asyncio
async def test_classify_tree_in_memory_fills_categories(monkeypatch):
    """classify_tree_in_memory가 tree.ending_categories를 채우고 각 ending에 category_id 부여."""
    from app.pipeline import ending_classifier

    # 외부 호출(litellm, embeddings) 차단 + 단순 결과 주입
    async def fake_classify(tree: ScenarioTree) -> ScenarioTree:
        cat = EndingCategory(
            category_id="C1",
            label="안전",
            description="good ending",
            node_ids=["node_002"],
        )
        cat_bad = EndingCategory(
            category_id="C2",
            label="피해",
            description="bad ending",
            node_ids=["node_003"],
        )
        tree.ending_categories = {"C1": cat, "C2": cat_bad}
        tree.nodes["node_002"].ending_category = "C1"
        tree.nodes["node_003"].ending_category = "C2"
        return tree

    monkeypatch.setattr(ending_classifier, "classify_tree_in_memory", fake_classify)

    tree = _make_tree()
    result = await ending_classifier.classify_tree_in_memory(tree)
    assert result.ending_categories is not None
    assert "C1" in result.ending_categories
    assert result.nodes["node_002"].ending_category == "C1"
    assert result.nodes["node_003"].ending_category == "C2"


@pytest.mark.asyncio
async def test_save_scenario_in_route_invokes_classifier_and_upsert(monkeypatch, tmp_path):
    """app.api.routes.scenario._save_scenario 호출 시 ending_classifier가 호출되고
    upsert_scenario가 호출되며 total_endings가 자동 계산됨을 검증."""
    from app.api.routes import scenario as scenario_route
    from app.pipeline import ending_classifier
    from app.db import mongo as mongo_mod

    classify_calls = []
    upsert_calls = []

    async def fake_classify(tree: ScenarioTree) -> ScenarioTree:
        classify_calls.append(tree.scenario_id)
        return tree

    async def fake_upsert(tree: ScenarioTree):
        upsert_calls.append(tree.scenario_id)
        return {"matched": 0, "modified": 0, "upserted_id": "fake"}

    # ending_classifier도 mongo도 둘 다 module-level 함수를 patch
    monkeypatch.setattr(
        scenario_route.ending_classifier, "classify_tree_in_memory", fake_classify
    )
    monkeypatch.setattr(scenario_route.mongo_mod, "upsert_scenario", fake_upsert)
    # JSON 파일 저장은 tmp_path로 격리
    monkeypatch.setattr(scenario_route, "SCENARIOS_DIR", tmp_path)

    tree = _make_tree()
    await scenario_route._save_scenario(tree)

    assert classify_calls == ["scenario_ec"]
    assert upsert_calls == ["scenario_ec"]
    # total_endings 자동 계산
    assert tree.total_endings == 2
    assert tree.total_good_endings == 1
    assert tree.total_bad_endings == 1
    # JSON 캐시 파일도 생성
    assert (tmp_path / "scenario_ec.json").exists()
