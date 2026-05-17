"""컨텍스트 압축 관리 모듈"""
import json
import logging
import litellm

from app.config import settings
from app.models.scenario import ScenarioNode, Choice
from app.pipeline.prompts import CONTEXT_SUMMARY_PROMPT

logger = logging.getLogger("pipeline.context_manager")


async def summarize_nodes(nodes_with_choices: list[tuple[ScenarioNode, Choice | None]]) -> str:
    """노드 목록을 LLM으로 요약"""
    if not nodes_with_choices:
        return ""

    # 요약할 텍스트 구성
    text_parts = []
    for node, choice in nodes_with_choices:
        text_parts.append(f"[상황] {node.text[:200]}")
        if choice:
            text_parts.append(f"[선택] {choice.text}")

    full_text = "\n".join(text_parts)

    try:
        response = await litellm.acompletion(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": CONTEXT_SUMMARY_PROMPT},
                {"role": "user", "content": full_text},
            ],
            timeout=settings.llm_timeout,
            api_key=settings.gemini_api_key,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        # 폴백: 첫 문장씩만 추출
        summaries = []
        for node, choice in nodes_with_choices:
            first_sentence = node.text.split(".")[0] + "."
            summaries.append(first_sentence)
            if choice:
                summaries.append(f"→ {choice.text}")
        return " ".join(summaries)[:500]


async def build_story_path(
    path: list[tuple[ScenarioNode, Choice | None]],
    current_depth: int,
    choice_taken: Choice | None = None
) -> str:
    """경로를 스토리 텍스트로 변환 (Progressive Compression)"""
    if not path:
        return ""

    if current_depth <= 2:
        # 깊이 0-2: 전체 텍스트 포함
        parts = []
        for node, choice in path:
            parts.append(node.text)
            if choice:
                parts.append(f'→ 선택: "{choice.text}"')
        result = "\n\n".join(parts)

    else:
        # 깊이 3+: 초기 노드 요약 + 최근 2개 노드 전체
        early_nodes = path[:-2]
        recent_nodes = path[-2:]

        summary = await summarize_nodes(early_nodes) if early_nodes else ""
        logger.debug("컨텍스트 압축: depth=%d, 요약 길이=%d", current_depth, len(summary))

        recent_parts = []
        for node, choice in recent_nodes:
            recent_parts.append(node.text)
            if choice:
                recent_parts.append(f'→ 선택: "{choice.text}"')

        recent_text = "\n\n".join(recent_parts)

        if summary:
            result = f"[이전 경과 요약]\n{summary}\n\n[최근 상황]\n{recent_text}"
        else:
            result = recent_text

    # 현재 선택을 별도로 추가 (텍스트 중복 방지)
    if choice_taken:
        result += f'\n\n→ 선택: "{choice_taken.text}"'

    return result


def estimate_tokens(text: str) -> int:
    """텍스트 토큰 수 추정 (한국어 기준 대략적)"""
    # 한국어는 대략 1.5-2글자당 1토큰
    return len(text) // 2
