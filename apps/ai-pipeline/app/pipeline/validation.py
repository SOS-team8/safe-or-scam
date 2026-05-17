"""시나리오 트리 구조 검증 모듈"""
import logging
from dataclasses import dataclass
from enum import Enum

from app.models.scenario import ScenarioTree

logger = logging.getLogger("pipeline.validation")


class ErrorType(Enum):
    ORPHAN_NODE = "orphan_node"
    BROKEN_LINK = "broken_link"
    NO_GOOD_ENDING = "no_good_ending"
    NO_BAD_ENDING = "no_bad_ending"
    LEAF_NOT_ENDING = "leaf_not_ending"
    DEPTH_EXCEEDED = "depth_exceeded"


@dataclass
class ValidationError:
    """검증 오류"""
    error_type: ErrorType
    node_id: str | None
    message: str


def validate_structure(tree: ScenarioTree) -> list[ValidationError]:
    """트리 구조 검증"""
    errors = []

    # 참조되는 노드 ID 수집
    referenced_ids = {tree.root_node_id}
    for node in tree.nodes.values():
        for choice in node.choices:
            if choice.next_node_id:
                referenced_ids.add(choice.next_node_id)

    # 1. 고아 노드 검사 (루트가 아닌데 참조되지 않는 노드)
    for node_id, node in tree.nodes.items():
        if node_id != tree.root_node_id and node_id not in referenced_ids:
            errors.append(ValidationError(
                ErrorType.ORPHAN_NODE,
                node_id,
                f"Node {node_id} is not referenced by any parent"
            ))

    # 2. 끊어진 링크 검사 (존재하지 않는 노드 참조)
    for node in tree.nodes.values():
        for choice in node.choices:
            if choice.next_node_id and choice.next_node_id not in tree.nodes:
                errors.append(ValidationError(
                    ErrorType.BROKEN_LINK,
                    node.id,
                    f"Choice {choice.id} references non-existent node {choice.next_node_id}"
                ))

    # 3. GOOD ending 존재 확인
    has_good_ending = any(
        node.type == "ending_good" for node in tree.nodes.values()
    )
    if not has_good_ending:
        errors.append(ValidationError(
            ErrorType.NO_GOOD_ENDING,
            None,
            "No good ending found in tree"
        ))

    # 4. BAD ending 존재 확인
    has_bad_ending = any(
        node.type == "ending_bad" for node in tree.nodes.values()
    )
    if not has_bad_ending:
        errors.append(ValidationError(
            ErrorType.NO_BAD_ENDING,
            None,
            "No bad ending found in tree"
        ))

    # 5. 리프 노드가 엔딩인지 확인
    for node in tree.nodes.values():
        is_leaf = len(node.choices) == 0 or all(
            c.next_node_id is None for c in node.choices
        )
        if is_leaf and not node.type.startswith("ending_"):
            errors.append(ValidationError(
                ErrorType.LEAF_NOT_ENDING,
                node.id,
                f"Leaf node {node.id} is not an ending type"
            ))

    # 6. 깊이 제한 초과 검사
    from app.config import settings
    for node in tree.nodes.values():
        if node.depth > settings.max_depth:
            errors.append(ValidationError(
                ErrorType.DEPTH_EXCEEDED,
                node.id,
                f"Node {node.id} exceeds max depth {settings.max_depth}"
            ))

    if errors:
        for err in errors:
            logger.warning("검증 오류: %s - %s", err.error_type.value, err.message)
    else:
        logger.info("구조 검증 통과: 노드 %d개", len(tree.nodes))

    return errors
