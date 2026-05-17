"""종료 신호 판단 모듈"""
import logging
from dataclasses import dataclass

from app.models.scenario import Resources, Choice

logger = logging.getLogger("pipeline.end_sequence")


@dataclass
class EndSignal:
    """종료 신호"""
    should_end: bool
    ending_type: str | None  # "good" | "bad" | None
    reason: str
    force: bool  # True면 LLM 판단 무시
 

def infer_ending(path_choices: list[Choice]) -> str:
    """선택 패턴 기반 엔딩 추론 (마지막 선택 우선)"""
    if not path_choices:
        return "bad"

    # 마지막 선택이 안전하면 good, 위험하면 bad
    if not path_choices[-1].is_dangerous:
        return "good"
    return "bad"


MIN_DEPTH_FOR_ENDING = 5  # 최소 k단계 진행 후에만 엔딩 가능


def compute_end_signal(
    resources: Resources,
    depth: int,
    max_depth: int,
    path_choices: list[Choice]
) -> EndSignal:
    """종료 신호 계산 (우선순위 순)"""

    def _end(ending_type, reason, force):
        signal = EndSignal(should_end=True, ending_type=ending_type, reason=reason, force=force)
        logger.info("EndSignal: end_%s (depth=%d, reason=%s, force=%s)", ending_type, depth, reason, force)
        return signal

    # Rule 0 (최우선): 최소 깊이 미달 → 무조건 계속 진행
    # money=0이어도 depth < 3이면 엔딩 불가 (게임이 너무 빨리 끝나지 않도록)
    if depth < MIN_DEPTH_FOR_ENDING:
        logger.debug("EndSignal: continue (depth=%d < MIN_DEPTH=%d)", depth, MIN_DEPTH_FOR_ENDING)
        return EndSignal(
            should_end=False,
            ending_type=None,
            reason="min_depth_not_reached",
            force=False
        )

    # Rule 1: 최대 깊이 도달 → 강제 종료 (선택 패턴 기반 엔딩 유형)
    if depth >= max_depth:
        return _end(infer_ending(path_choices), "max_depth", True)

    # Rule 2: money=0 → 강제 BAD (금전 피해) - 이제 depth >= 3에서만 적용됨
    if resources.money <= 0:
        return _end("bad", "money_depleted", True)

    # Rule 3 & 4: 연속 선택 패턴
    if len(path_choices) >= 3:
        recent = path_choices[-3:]

        # Rule 3: 위험 선택 3연속 → BAD 제안
        if all(c.is_dangerous for c in recent):
            return _end("bad", "3x_dangerous", False)

        # Rule 4: 안전 선택 3연속 → GOOD 제안
        if all(not c.is_dangerous for c in recent):
            return _end("good", "3x_safe", False)

    # 계속 진행
    signal = EndSignal(
        should_end=False,
        ending_type=None,
        reason="continue",
        force=False
    )
    logger.debug("EndSignal: %s (depth=%d, reason=%s)", "continue", depth, signal.reason)
    return signal
