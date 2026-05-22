"""회귀 baseline 용 in-memory 시나리오 (Phase 3 §3.10).

데모 (scam-or-safe/frontend/src/lib/game-engine.ts) processChoice 로직과 100%
동일성을 검증하기 위해 작은 트리를 정의. demo-references/01_game_logic_reference.md
의 의사 코드를 따라 수동 계산한 기대값을 regression_baseline.md 에 명시.

트리 구조:

  n0 (narrative, root)
    ├── n0_c1 (safe, +awareness 1)        → n1
    └── n0_c2 (dangerous, -money 2, -trust 1) → n2

  n1 (narrative)
    ├── n1_c1 (safe, +awareness 1, +money 1)   → n_end_good
    └── n1_c2 (dangerous, -trust 2, -money 2)  → n_end_bad

  n2 (narrative)
    ├── n2_c1 (safe, +awareness 2)              → n_end_good
    └── n2_c2 (dangerous, -money 1)             → n_end_bad

  n_end_good (ending_good)
  n_end_bad  (ending_bad)

초기 자원: trust=3, money=3, awareness=1 (scenario-tree v2 §5).
"""
from __future__ import annotations

from datetime import UTC, datetime

from app.models.common import (
    Choice,
    DangerFeedback,
    EducationalContent,
    ResourceDelta,
    ScenarioNode,
)
from app.models.scenario import Scenario

_NOW = datetime(2026, 5, 18, tzinfo=UTC)

REGRESSION_SCENARIO_ID = "regression_scenario"


def _danger_feedback(label: str) -> DangerFeedback:
    return DangerFeedback(
        why_dangerous=f"{label} 위험 사유",
        warning_signs=[f"{label} 경고 1", f"{label} 경고 2"],
        safe_alternative=f"{label} 안전한 대안",
    )


def _educational_content(label: str) -> EducationalContent:
    return EducationalContent(
        title=f"{label} 교육 카드",
        explanation=f"{label} 설명",
        prevention_tips=[f"{label} 팁 1", f"{label} 팁 2"],
        warning_signs=[f"{label} 신호 1"],
    )


_NODES: dict[str, ScenarioNode] = {
    "n0": ScenarioNode(
        id="n0",
        type="narrative",
        text="시나리오 시작 — 의심스러운 문자가 도착했다.",
        choices=[
            Choice(
                id="n0_c1",
                text="문자를 무시한다",
                next_node_id="n1",
                is_dangerous=False,
                resource_effect=ResourceDelta(trust=0, money=0, awareness=1),
            ),
            Choice(
                id="n0_c2",
                text="링크를 즉시 클릭한다",
                next_node_id="n2",
                is_dangerous=True,
                resource_effect=ResourceDelta(trust=-1, money=-2, awareness=0),
                danger_feedback=_danger_feedback("n0_c2"),
            ),
        ],
        educational_content=_educational_content("n0"),
        depth=0,
    ),
    "n1": ScenarioNode(
        id="n1",
        type="narrative",
        text="문자를 무시하고 침착하게 확인 중이다.",
        choices=[
            Choice(
                id="n1_c1",
                text="공식 채널로 사실 확인",
                next_node_id="n_end_good",
                is_dangerous=False,
                resource_effect=ResourceDelta(trust=0, money=1, awareness=1),
            ),
            Choice(
                id="n1_c2",
                text="결국 호기심에 링크 클릭",
                next_node_id="n_end_bad",
                is_dangerous=True,
                resource_effect=ResourceDelta(trust=-2, money=-2, awareness=0),
                danger_feedback=_danger_feedback("n1_c2"),
            ),
        ],
        educational_content=_educational_content("n1"),
        depth=1,
        parent_node_id="n0",
        parent_choice_id="n0_c1",
    ),
    "n2": ScenarioNode(
        id="n2",
        type="narrative",
        text="링크를 누르니 가짜 로그인 화면이 떴다.",
        choices=[
            Choice(
                id="n2_c1",
                text="앗 가짜다 — 즉시 페이지 닫기",
                next_node_id="n_end_good",
                is_dangerous=False,
                resource_effect=ResourceDelta(trust=0, money=0, awareness=2),
            ),
            Choice(
                id="n2_c2",
                text="ID/PW 입력 시도",
                next_node_id="n_end_bad",
                is_dangerous=True,
                resource_effect=ResourceDelta(trust=0, money=-1, awareness=0),
                danger_feedback=_danger_feedback("n2_c2"),
            ),
        ],
        educational_content=_educational_content("n2"),
        depth=1,
        parent_node_id="n0",
        parent_choice_id="n0_c2",
    ),
    "n_end_good": ScenarioNode(
        id="n_end_good",
        type="ending_good",
        text="스마트하게 피싱을 차단했다.",
        choices=[],
        depth=2,
        ending_category="smart_block",
    ),
    "n_end_bad": ScenarioNode(
        id="n_end_bad",
        type="ending_bad",
        text="피해를 입었다.",
        choices=[],
        depth=2,
        ending_category="financial_loss",
    ),
}


def build_regression_scenario() -> Scenario:
    """매 테스트마다 fresh Scenario Document 인스턴스."""
    return Scenario(
        scenario_id=REGRESSION_SCENARIO_ID,
        title="회귀 baseline",
        description="Phase 3 §3.10 회귀 검증용",
        phishing_type="smishing",
        difficulty="easy",
        root_node_id="n0",
        nodes={k: ScenarioNode(**v.model_dump()) for k, v in _NODES.items()},
        protagonist=None,
        prologue=None,
        total_endings=2,
        total_good_endings=1,
        total_bad_endings=1,
        ending_categories=None,
        tags=[],
        created_at=_NOW,
        updated_at=_NOW,
    )
