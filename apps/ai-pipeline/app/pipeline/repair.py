"""시나리오 트리 복구 모듈"""
import logging

from app.models.scenario import ScenarioTree, ScenarioNode, EducationalContent
from app.pipeline.validation import ValidationError, ErrorType

logger = logging.getLogger("pipeline.repair")


def repair_tree(tree: ScenarioTree, errors: list[ValidationError]) -> ScenarioTree:
    """검증 오류 복구"""
    logger.info("복구 시작: %d건의 오류", len(errors))
    for error in errors:
        if error.error_type == ErrorType.ORPHAN_NODE:
            # 고아 노드 제거
            if error.node_id and error.node_id in tree.nodes:
                logger.info("고아 노드 제거: %s", error.node_id)
                del tree.nodes[error.node_id]

        elif error.error_type == ErrorType.BROKEN_LINK:
            # 끊어진 링크 → 폴백 엔딩 연결
            if error.node_id:
                node = tree.nodes.get(error.node_id)
                if node:
                    for choice in node.choices:
                        if choice.next_node_id and choice.next_node_id not in tree.nodes:
                            # 폴백 엔딩 생성
                            fallback = _create_fallback_ending(
                                f"fallback_{choice.id}",
                                node.depth + 1,
                                error.node_id,
                                choice.id,
                                ending_type="bad"
                            )
                            tree.nodes[fallback.id] = fallback
                            choice.next_node_id = fallback.id
                            logger.info("끊어진 링크 복구: %s → %s", choice.id, fallback.id)

        elif error.error_type == ErrorType.NO_GOOD_ENDING:
            # GOOD 엔딩 추가
            fallback = _create_fallback_ending(
                "fallback_good",
                5,
                None,
                None,
                ending_type="good"
            )
            tree.nodes[fallback.id] = fallback
            # 아무 리프 노드에 연결
            _connect_to_leaf(tree, fallback.id)

        elif error.error_type == ErrorType.NO_BAD_ENDING:
            # BAD 엔딩 추가
            fallback = _create_fallback_ending(
                "fallback_bad",
                5,
                None,
                None,
                ending_type="bad"
            )
            tree.nodes[fallback.id] = fallback
            # 아무 리프 노드에 연결
            _connect_to_leaf(tree, fallback.id)

        elif error.error_type == ErrorType.LEAF_NOT_ENDING:
            # 리프 노드를 엔딩으로 변환
            if error.node_id:
                node = tree.nodes.get(error.node_id)
                if node:
                    logger.info("리프→엔딩 변환: %s", error.node_id)
                    node.type = "ending_bad"
                    node.choices = []

    logger.info("복구 완료: 최종 노드=%d", len(tree.nodes))
    return tree


def _create_fallback_ending(
    node_id: str,
    depth: int,
    parent_node_id: str | None,
    parent_choice_id: str | None,
    ending_type: str = "bad"
) -> ScenarioNode:
    """폴백 엔딩 노드 생성"""
    if ending_type == "good":
        text = "당신은 상황의 이상함을 감지하고 현명하게 대처했습니다. 피해를 예방했습니다!"
        title = "축하합니다"
        explanation = "의심스러운 상황에서 신중하게 판단하셨습니다."
    else:
        text = "안타깝게도 상황이 좋지 않게 흘러갔습니다. 피해가 발생했습니다."
        title = "주의가 필요합니다"
        explanation = "이런 상황에서는 더 신중한 판단이 필요합니다."

    return ScenarioNode(
        id=node_id,
        type=f"ending_{ending_type}",
        text=text,
        choices=[],
        educational_content=EducationalContent(
            title=title,
            explanation=explanation,
            prevention_tips=["의심스러운 연락은 먼저 끊으세요", "공식 채널로 확인하세요"],
            warning_signs=["급한 결정 요구", "개인정보 요청"],
        ),
        depth=depth,
        parent_node_id=parent_node_id,
        parent_choice_id=parent_choice_id,
    )


def _connect_to_leaf(tree: ScenarioTree, ending_id: str):
    """폴백 엔딩을 리프 노드에 연결"""
    for node in tree.nodes.values():
        if node.type == "narrative" and node.choices:
            for choice in node.choices:
                if not choice.next_node_id:
                    choice.next_node_id = ending_id
                    return
