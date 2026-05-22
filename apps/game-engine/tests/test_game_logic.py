"""게임 로직 단위 + 회귀 baseline 테스트.

Phase 3 §3.10: 데모 (scam-or-safe/frontend/src/lib/game-engine.ts) processChoice
와 정확히 동일한 출력을 내는지 검증.

baseline 산출물: logs/integration/_workspace/02_game_engine/regression_baseline.md
"""
from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.models.common import Resources
from app.models.game_session import GameSession
from app.services.game_logic import (
    InvalidChoiceError,
    process_choice,
    undo_last_choice,
)
from tests.fixtures.regression_scenario import build_regression_scenario


pytestmark = pytest.mark.usefixtures("test_db")


def _fresh_session(session_id: str = "test_session", user_id: int = 1) -> GameSession:
    return GameSession(
        session_id=session_id,
        scenario_id="regression_scenario",
        user_id=user_id,
        current_node_id="n0",
        resources=Resources(),  # 3/3/1
        choices_history=[],
        dangerous_count=0,
        visited_endings=[],
        status="playing",
        started_at=datetime(2026, 5, 18, 9, 0, tzinfo=UTC),
        completed_at=None,
    )


# -------- 단위 케이스 --------


async def test_process_choice_safe_step():
    session = _fresh_session()
    scenario = build_regression_scenario()

    result = await process_choice(session, scenario, "n0_c1")

    assert session.resources.trust == 3
    assert session.resources.money == 3
    assert session.resources.awareness == 2  # +1 clamp
    assert session.dangerous_count == 0
    assert session.current_node_id == "n1"
    assert len(session.choices_history) == 1
    h = session.choices_history[0]
    assert h.node_id == "n0"
    assert h.choice_id == "n0_c1"
    assert h.is_dangerous is False

    assert result.new_node.id == "n1"
    assert result.is_finished is False
    assert result.ending_type is None
    assert result.ending_category is None
    assert result.danger_feedback is None
    assert result.educational_content is None


async def test_process_choice_dangerous_step_returns_feedback_and_education():
    """is_dangerous=True 시 danger_feedback + educational_content 객체 패스스루."""
    session = _fresh_session()
    scenario = build_regression_scenario()

    result = await process_choice(session, scenario, "n0_c2")

    assert session.resources.trust == 2  # 3-1
    assert session.resources.money == 1  # 3-2
    assert session.resources.awareness == 1  # 0
    assert session.dangerous_count == 1
    assert session.current_node_id == "n2"

    assert result.danger_feedback is not None
    assert result.danger_feedback.why_dangerous == "n0_c2 위험 사유"
    assert len(result.danger_feedback.warning_signs) == 2
    assert result.educational_content is not None
    assert result.educational_content.title == "n0 교육 카드"
    assert result.is_finished is False


async def test_process_choice_invalid_choice_raises():
    session = _fresh_session()
    scenario = build_regression_scenario()
    with pytest.raises(InvalidChoiceError, match="Invalid choice_id"):
        await process_choice(session, scenario, "nonexistent_choice")


async def test_process_choice_reaches_ending_good():
    session = _fresh_session()
    scenario = build_regression_scenario()
    await process_choice(session, scenario, "n0_c1")
    result = await process_choice(session, scenario, "n1_c1")
    assert result.is_finished is True
    assert result.ending_type == "ending_good"
    assert result.ending_category == "smart_block"
    assert result.new_node.id == "n_end_good"


# -------- 회귀 baseline (Path A / B / C) --------


async def test_regression_path_a_all_safe_good_ending():
    """Path A: ["n0_c1", "n1_c1"] → ending_good. regression_baseline.md §4."""
    session = _fresh_session()
    scenario = build_regression_scenario()

    # Step 1
    r1 = await process_choice(session, scenario, "n0_c1")
    assert session.resources == Resources(trust=3, money=3, awareness=2)
    assert session.dangerous_count == 0
    assert session.current_node_id == "n1"
    assert r1.is_finished is False
    assert r1.danger_feedback is None
    assert r1.educational_content is None

    # Step 2 (final)
    r2 = await process_choice(session, scenario, "n1_c1")
    assert session.resources == Resources(trust=3, money=4, awareness=3)
    assert session.dangerous_count == 0
    assert session.current_node_id == "n_end_good"
    assert r2.is_finished is True
    assert r2.ending_type == "ending_good"
    assert r2.ending_category == "smart_block"

    # history 4-field shape
    assert len(session.choices_history) == 2
    h1, h2 = session.choices_history
    assert h1.model_dump().keys() == {"node_id", "choice_id", "is_dangerous", "timestamp"}
    assert h1.node_id == "n0" and h1.choice_id == "n0_c1" and h1.is_dangerous is False
    assert h2.node_id == "n1" and h2.choice_id == "n1_c1" and h2.is_dangerous is False


async def test_regression_path_b_all_dangerous_bad_ending():
    """Path B: ["n0_c2", "n2_c2"] → ending_bad, dangerous_count=2. baseline §5."""
    session = _fresh_session()
    scenario = build_regression_scenario()

    r1 = await process_choice(session, scenario, "n0_c2")
    assert session.resources == Resources(trust=2, money=1, awareness=1)
    assert session.dangerous_count == 1
    assert session.current_node_id == "n2"
    assert r1.danger_feedback is not None
    assert r1.educational_content is not None
    assert r1.educational_content.title == "n0 교육 카드"

    r2 = await process_choice(session, scenario, "n2_c2")
    assert session.resources == Resources(trust=2, money=0, awareness=1)
    assert session.dangerous_count == 2
    assert session.current_node_id == "n_end_bad"
    assert r2.is_finished is True
    assert r2.ending_type == "ending_bad"
    assert r2.ending_category == "financial_loss"
    assert r2.danger_feedback is not None
    assert r2.educational_content is not None
    assert r2.educational_content.title == "n2 교육 카드"


async def test_regression_path_c_mixed():
    """Path C: ["n0_c1", "n1_c2"] → ending_bad, dangerous_count=1. baseline §6."""
    session = _fresh_session()
    scenario = build_regression_scenario()

    r1 = await process_choice(session, scenario, "n0_c1")
    assert session.resources == Resources(trust=3, money=3, awareness=2)
    assert session.dangerous_count == 0
    assert r1.danger_feedback is None

    r2 = await process_choice(session, scenario, "n1_c2")
    assert session.resources == Resources(trust=1, money=1, awareness=2)
    assert session.dangerous_count == 1
    assert session.current_node_id == "n_end_bad"
    assert r2.is_finished is True
    assert r2.ending_type == "ending_bad"
    assert r2.ending_category == "financial_loss"
    assert r2.danger_feedback is not None
    assert r2.educational_content is not None
    assert r2.educational_content.title == "n1 교육 카드"


# -------- clamp --------


async def test_clamp_lower_bound():
    """delta 가 자원을 0 아래로 만들지 않음."""
    from app.services.game_logic import _clamp

    assert _clamp(-3) == 0
    assert _clamp(0) == 0


async def test_clamp_upper_bound():
    from app.services.game_logic import _clamp

    assert _clamp(7) == 5
    assert _clamp(5) == 5


# -------- undo --------


async def test_undo_returns_to_previous_state():
    session = _fresh_session()
    scenario = build_regression_scenario()
    await process_choice(session, scenario, "n0_c1")  # n1, awareness=2
    await process_choice(session, scenario, "n1_c2")  # n_end_bad (dangerous)

    assert session.current_node_id == "n_end_bad"
    assert session.dangerous_count == 1

    await undo_last_choice(session, scenario)

    # n1 상태로 복원
    assert session.current_node_id == "n1"
    assert session.dangerous_count == 0
    assert session.resources == Resources(trust=3, money=3, awareness=2)
    assert len(session.choices_history) == 1
    assert session.status == "playing"


async def test_undo_empty_history_raises():
    session = _fresh_session()
    scenario = build_regression_scenario()
    with pytest.raises(ValueError, match="No choices to undo"):
        await undo_last_choice(session, scenario)


async def test_undo_then_replay_consistency():
    """undo 후 다시 같은 선택 → 원래 상태와 동일."""
    session = _fresh_session()
    scenario = build_regression_scenario()
    await process_choice(session, scenario, "n0_c1")
    await process_choice(session, scenario, "n1_c1")
    before_resources = session.resources.model_copy()
    before_node = session.current_node_id
    before_dangerous = session.dangerous_count

    await undo_last_choice(session, scenario)
    await process_choice(session, scenario, "n1_c1")

    assert session.current_node_id == before_node
    assert session.resources == before_resources
    assert session.dangerous_count == before_dangerous
