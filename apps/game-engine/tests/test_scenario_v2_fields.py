"""scenario-tree v2 신규 필드 검증.

§7 EndingCategory 모델, §2 ScenarioNode.ending_category, §1 Scenario.ending_categories.
nullable + default None 으로 기존 6개 시드 시나리오 호환 유지.
"""
from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.models.common import EndingCategory, ScenarioNode
from app.models.scenario import Scenario


def test_ending_category_model_construction():
    c = EndingCategory(
        category_id="financial_loss",
        label="금전 손실",
        description="피해자가 돈을 잃는 엔딩 카테고리",
        node_ids=["node_e1", "node_e2"],
    )
    assert c.category_id == "financial_loss"
    assert c.label == "금전 손실"
    assert c.node_ids == ["node_e1", "node_e2"]


def test_ending_category_requires_node_ids_list():
    """node_ids 는 list[str] — 미지정 시 ValidationError."""
    with pytest.raises(Exception):
        EndingCategory(  # type: ignore[call-arg]
            category_id="x", label="x", description="x",
        )


def test_scenario_node_ending_category_default_none():
    """기존 6개 시드 호환: ending_category 미지정 → None."""
    node = ScenarioNode(id="n1", type="narrative", text="hello")
    assert node.ending_category is None


def test_scenario_node_ending_category_set():
    node = ScenarioNode(
        id="n2",
        type="ending_bad",
        text="game over",
        ending_category="financial_loss",
    )
    assert node.ending_category == "financial_loss"


async def test_scenario_insert_without_ending_categories(test_db):
    """기존 시드 호환: ending_categories 미지정 → None default."""
    s = Scenario(
        scenario_id="s_legacy_1",
        title="legacy",
        description="legacy desc",
        phishing_type="smishing",
        difficulty="easy",
        root_node_id="n0",
        nodes={
            "n0": ScenarioNode(id="n0", type="narrative", text="hi"),
        },
        total_endings=0,
        total_good_endings=0,
        total_bad_endings=0,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await s.insert()
    fetched = await Scenario.find_one(Scenario.scenario_id == "s_legacy_1")
    assert fetched is not None
    assert fetched.ending_categories is None
    assert fetched.nodes["n0"].ending_category is None


async def test_scenario_with_ending_categories_roundtrip(test_db):
    cat = EndingCategory(
        category_id="loss",
        label="손실",
        description="피해자가 손해를 보는 엔딩",
        node_ids=["n_e1"],
    )
    s = Scenario(
        scenario_id="s_v2_1",
        title="v2 시나리오",
        description="v2 desc",
        phishing_type="smishing",
        difficulty="easy",
        root_node_id="n0",
        nodes={
            "n0": ScenarioNode(id="n0", type="narrative", text="hi"),
            "n_e1": ScenarioNode(
                id="n_e1",
                type="ending_bad",
                text="end",
                ending_category="loss",
            ),
        },
        total_endings=1,
        total_good_endings=0,
        total_bad_endings=1,
        ending_categories={"loss": cat},
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    await s.insert()
    fetched = await Scenario.find_one(Scenario.scenario_id == "s_v2_1")
    assert fetched is not None
    assert fetched.ending_categories is not None
    assert "loss" in fetched.ending_categories
    assert fetched.ending_categories["loss"].label == "손실"
    assert fetched.ending_categories["loss"].node_ids == ["n_e1"]
    assert fetched.nodes["n_e1"].ending_category == "loss"
    assert fetched.nodes["n0"].ending_category is None
