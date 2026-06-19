"""게임 로직 (데모 game-engine.ts 이식).

scam-or-safe/frontend/src/lib/game-engine.ts 의 createSession/processChoice/getResult
/undoLastChoice 를 FastAPI + MongoDB Beanie 환경으로 이식.

핵심:
- in-memory 세션 → Beanie GameSession Document 수정 (저장은 라우트가)
- choices_history entry shape: {node_id, choice_id, is_dangerous, timestamp}
- 위험 선택 시 danger_feedback / educational_content 객체 패스스루
- ending 노드 도달 부가 처리 (PlayLog 생성, UserScenarioProgress upsert) 는 라우트 책임
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

from app.models.common import (
    DangerFeedback,
    EducationalContent,
    Resources,
    ScenarioNode,
)
from app.models.game_session import ChoiceHistoryEntry, GameSession
from app.models.scenario import Scenario


def _clamp(value: int, low: int = 0, high: int = 5) -> int:
    """game-engine-ts clamp 와 동일."""
    return max(low, min(high, value))


@dataclass
class MoveResult:
    """process_choice 결과."""

    new_node: ScenarioNode
    danger_feedback: DangerFeedback | None
    educational_content: EducationalContent | None
    is_finished: bool
    ending_type: Literal["ending_good", "ending_bad"] | None
    ending_category: str | None


class InvalidChoiceError(ValueError):
    """choice_id 가 현재 노드에 없거나 next_node_id dangling."""


async def process_choice(
    session: GameSession,
    scenario: Scenario,
    choice_id: str,
    now: datetime | None = None,
) -> MoveResult:
    """단일 선택 처리 (in-place session 수정).

    데모 processChoice 의 8단계 + 응답 빌드:
    1. current_node 조회
    2. choice 매칭 (없으면 InvalidChoiceError)
    3. choice.next_node_id dangling 검사
    4. resources clamp 적용
    5. choices_history append
    6. dangerous_count 증가
    7. current_node_id 갱신
    8. is_finished / ending_type / ending_category / danger_feedback / educational_content 빌드

    **저장은 호출자 책임** (라우트가 session.save()).
    ending 도달 시 status="completed", PlayLog, UserScenarioProgress upsert 도 라우트 책임.
    """
    if now is None:
        now = datetime.now(UTC)

    current_node = scenario.nodes.get(session.current_node_id)
    if current_node is None:
        raise InvalidChoiceError(
            f"current_node_id '{session.current_node_id}' not in scenario.nodes"
        )

    choice = next((c for c in current_node.choices if c.id == choice_id), None)
    if choice is None:
        raise InvalidChoiceError(f"Invalid choice_id: {choice_id}")

    if choice.next_node_id is None:
        raise InvalidChoiceError(
            f"Choice '{choice_id}' has no next_node_id"
        )

    if choice.next_node_id not in scenario.nodes:
        raise InvalidChoiceError(
            f"next_node_id '{choice.next_node_id}' not in scenario.nodes"
        )

    # 4. resources clamp 적용
    r = session.resources
    d = choice.resource_effect
    session.resources = Resources(
        trust=_clamp(r.trust + d.trust),
        money=_clamp(r.money + d.money),
        awareness=_clamp(r.awareness + d.awareness),
    )

    # 5. choices_history append
    session.choices_history.append(
        ChoiceHistoryEntry(
            node_id=session.current_node_id,
            choice_id=choice.id,
            is_dangerous=choice.is_dangerous,
            timestamp=now,
        )
    )

    # 6. dangerous_count 증가
    if choice.is_dangerous:
        session.dangerous_count += 1

    # 7. current_node_id 갱신
    session.current_node_id = choice.next_node_id

    new_node = scenario.nodes[choice.next_node_id]

    # 8. 응답 빌드 (game-engine-api v2 §3-4)
    danger_feedback = choice.danger_feedback if choice.is_dangerous else None
    educational_content = (
        current_node.educational_content if choice.is_dangerous else None
    )
    is_finished = new_node.type.startswith("ending_")
    ending_type: Literal["ending_good", "ending_bad"] | None = (
        new_node.type if is_finished else None  # type: ignore[assignment]
    )
    ending_category = new_node.ending_category if is_finished else None

    return MoveResult(
        new_node=new_node,
        danger_feedback=danger_feedback,
        educational_content=educational_content,
        is_finished=is_finished,
        ending_type=ending_type,
        ending_category=ending_category,
    )


async def undo_last_choice(
    session: GameSession,
    scenario: Scenario,
) -> None:
    """직전 선택 되돌리기 (데모 undoLastChoice 이식).

    1. choices_history 가 비어있으면 ValueError
    2. new_history = choices_history[:-1]
    3. 루트부터 new_history 의 choice_id 순서로 재계산
    4. session 의 resources/current_node_id/dangerous_count/choices_history 갱신
    5. status="playing" 복원 (ending 도달 후 undo 케이스)

    저장은 호출자 책임.
    """
    if not session.choices_history:
        raise ValueError("No choices to undo")

    new_history = session.choices_history[:-1]

    # 루트부터 in-memory 재계산
    cur_node_id = scenario.root_node_id
    cur_resources = Resources()
    cur_dangerous_count = 0
    replayed_history: list[ChoiceHistoryEntry] = []

    for entry in new_history:
        node = scenario.nodes.get(cur_node_id)
        if node is None:
            raise ValueError(
                f"replay failed: node '{cur_node_id}' missing in scenario"
            )
        choice = next(
            (c for c in node.choices if c.id == entry.choice_id), None
        )
        if choice is None or choice.next_node_id is None:
            raise ValueError(
                f"replay failed: choice '{entry.choice_id}' invalid at node '{cur_node_id}'"
            )
        d = choice.resource_effect
        cur_resources = Resources(
            trust=_clamp(cur_resources.trust + d.trust),
            money=_clamp(cur_resources.money + d.money),
            awareness=_clamp(cur_resources.awareness + d.awareness),
        )
        if choice.is_dangerous:
            cur_dangerous_count += 1
        # history entry 는 원본 timestamp 유지
        replayed_history.append(entry)
        cur_node_id = choice.next_node_id

    session.current_node_id = cur_node_id
    session.resources = cur_resources
    session.dangerous_count = cur_dangerous_count
    session.choices_history = replayed_history
    session.status = "playing"
    session.completed_at = None
