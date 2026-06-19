"""scenario-tree contract v2 모델 검증.

- ScenarioTree.id → scenario_id 통일 (ADR-008)
- total_endings / total_good_endings / total_bad_endings / tags / updated_at 추가
- EndingCategory 모델 신규
- ScenarioNode.ending_category 신규
- metadata 제거
- v1 JSON (id 필드)도 alias로 load 가능
"""
from datetime import datetime, timezone

import pytest

from app.models.scenario import (
    EndingCategory,
    ScenarioNode,
    ScenarioTree,
)


def test_ending_category_model_fields():
    cat = EndingCategory(
        category_id="financial_loss",
        label="금전 손실",
        description="송금으로 돈을 잃은 엔딩 그룹",
        node_ids=["node_005", "node_007"],
    )
    assert cat.category_id == "financial_loss"
    assert cat.label == "금전 손실"
    assert cat.node_ids == ["node_005", "node_007"]


def test_scenario_node_has_ending_category_field():
    node = ScenarioNode(
        id="node_001",
        type="narrative",
        text="x",
        depth=0,
    )
    assert node.ending_category is None
    node.ending_category = "C1"
    assert node.ending_category == "C1"


def test_scenario_tree_v2_fields_exist(sample_scenario_v1_dict):
    """v1 JSON을 alias로 load할 때 scenario_id로 매핑되고, 새 v2 필드는 기본값을 가진다."""
    tree = ScenarioTree.model_validate(sample_scenario_v1_dict)
    # scenario_id로 매핑 (v1의 'id' 필드를 alias로 수용)
    assert tree.scenario_id == "scenario_v1test"
    # v2 새 필드 기본값
    assert tree.total_endings == 0
    assert tree.total_good_endings == 0
    assert tree.total_bad_endings == 0
    assert tree.tags == []
    assert isinstance(tree.updated_at, datetime)
    assert tree.ending_categories is None
    # v1의 metadata는 v2에서 제거 — 모델에 필드 자체가 없어야 함
    assert not hasattr(tree, "metadata")


def test_scenario_tree_serialize_uses_scenario_id(sample_scenario_v1_dict):
    """직렬화 시 'id'가 아닌 'scenario_id'로 출력되어야 game-engine과 컬렉션 필드명 일치."""
    tree = ScenarioTree.model_validate(sample_scenario_v1_dict)
    dumped = tree.model_dump(mode="json")
    assert "scenario_id" in dumped
    assert dumped["scenario_id"] == "scenario_v1test"
    # 'id' 필드는 더 이상 ScenarioTree 최상위에 없어야 함 (alias만 허용, 출력은 scenario_id)
    assert "id" not in dumped or dumped.get("id") != "scenario_v1test"


def test_scenario_tree_construction_with_scenario_id():
    """새 코드 경로: scenario_id로 직접 생성."""
    tree = ScenarioTree(
        scenario_id="scenario_abc",
        title="t",
        description="d",
        phishing_type="smishing",
        difficulty="easy",
        root_node_id="node_001",
        nodes={
            "node_001": ScenarioNode(id="node_001", type="ending_good", text="end", depth=0),
        },
        created_at=datetime.now(timezone.utc),
    )
    assert tree.scenario_id == "scenario_abc"
    assert tree.total_endings == 0  # 자동 계산 아님; 별도 helper로 갱신
