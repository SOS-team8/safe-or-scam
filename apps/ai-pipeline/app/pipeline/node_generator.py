"""LLM 노드 생성 모듈"""
import json
import asyncio
import logging
from pydantic import BaseModel
import litellm

from app.config import settings

logger = logging.getLogger("pipeline.node_generator")
from app.models.scenario import Resources, ResourceDelta, ScenarioNode, Choice, ProtagonistProfile, DangerFeedback
from app.pipeline.prompts import (
    ROOT_SYSTEM_PROMPT,
    NODE_SYSTEM_PROMPT,
    build_root_prompt,
    build_node_prompt,
)


class ChoiceResult(BaseModel):
    """LLM이 생성한 선택지"""
    text: str
    is_dangerous: bool
    resource_effect: dict[str, int]
    danger_feedback: dict | None = None  # 위험한 선택인 경우 피드백


class GenerationResult(BaseModel):
    """LLM이 생성한 노드"""
    protagonist: dict | None = None  # 루트 노드에서만 생성
    prologue: str | None = None  # 루트 노드에서만 생성 (이전 상황 설명)
    node_type: str
    narrative_text: str
    choices: list[ChoiceResult]
    image_prompt: str | None = None
    reasoning: str


class GenerationContext(BaseModel):
    """노드 생성 컨텍스트"""
    phishing_type: str
    difficulty: str
    story_path: str
    choice_taken: str
    current_resources: Resources
    current_depth: int
    max_depth: int
    should_end: bool
    force_end: bool
    ending_type_hint: str | None = None
    protagonist: ProtagonistProfile | None = None


def infer_ending_from_hint(ending_type_hint: str | None) -> str:
    """엔딩 타입 힌트 기반 추론 (폴백용)"""
    return ending_type_hint if ending_type_hint in ("good", "bad") else "bad"


async def generate_root_node(
    phishing_type: str,
    difficulty: str,
    seed_info: str | None = None
) -> GenerationResult:
    """루트 노드 생성"""
    user_prompt = build_root_prompt(phishing_type, difficulty, seed_info)

    for attempt in range(settings.retry_count + 1):
        try:
            response = await litellm.acompletion(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": ROOT_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                timeout=settings.llm_timeout,
                api_key=settings.gemini_api_key,
            )

            content = response.choices[0].message.content
            data = json.loads(content)
            result = GenerationResult.model_validate(data)
            logger.info("Root 노드 생성 성공: type=%s, choices=%d", result.node_type, len(result.choices))
            return result

        except Exception as e:
            if attempt == settings.retry_count:
                # 폴백: 기본 루트 노드
                logger.warning("Root 생성 실패, 폴백 사용: %s", str(e)[:100])
                return GenerationResult(
                    node_type="narrative",
                    narrative_text=f"당신의 휴대폰에 알 수 없는 번호로 연락이 왔습니다. {phishing_type} 관련 의심스러운 내용입니다.",
                    choices=[
                        ChoiceResult(text="응답한다", is_dangerous=True, resource_effect={"trust": 1, "money": 0, "awareness": 0}),
                        ChoiceResult(text="무시한다", is_dangerous=False, resource_effect={"trust": -1, "money": 0, "awareness": 1}),
                    ],
                    image_prompt="A middle-aged Korean person in casual home clothes, receiving a suspicious phone call, tense atmosphere, modern Korean apartment living room, dark lighting, webtoon style illustration, no text, no letters",
                    reasoning=f"LLM 호출 실패로 폴백 노드 생성: {str(e)}"
                )
            # 지수 백오프: 1s, 2s, 4s
            delay = 1 * (2 ** attempt)
            logger.warning("Root 생성 attempt %d 실패, %ds 후 재시도...", attempt + 1, delay)
            await asyncio.sleep(delay)


async def generate_node(context: GenerationContext) -> GenerationResult:
    """다음 노드 생성"""
    user_prompt = build_node_prompt(
        phishing_type=context.phishing_type,
        difficulty=context.difficulty,
        story_path=context.story_path,
        choice_taken=context.choice_taken,
        current_resources=context.current_resources.model_dump(),
        current_depth=context.current_depth,
        max_depth=context.max_depth,
        should_end=context.should_end,
        force_end=context.force_end,
        ending_type_hint=context.ending_type_hint,
        protagonist=context.protagonist,
    )

    for attempt in range(settings.retry_count + 1):
        try:
            response = await litellm.acompletion(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": NODE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                timeout=settings.llm_timeout,
                api_key=settings.gemini_api_key,
            )

            content = response.choices[0].message.content
            data = json.loads(content)
            result = GenerationResult.model_validate(data)
            logger.info(
                "노드 생성 성공: depth=%d, type=%s, choices=%d",
                context.current_depth, result.node_type, len(result.choices)
            )
            return result

        except Exception as e:
            if attempt == settings.retry_count:
                # 폴백: 강제 종료가 필요하거나 최대 깊이에 도달한 경우에만 엔딩 노드 생성
                if context.force_end or context.current_depth >= context.max_depth - 1:
                    ending_type = infer_ending_from_hint(context.ending_type_hint)
                    # 주인공 정보를 폴백 이미지 프롬프트에 포함
                    if context.protagonist:
                        protagonist_desc = f"{context.protagonist.description}, {context.protagonist.appearance}"
                    else:
                        protagonist_desc = "A middle-aged Korean person in casual clothes"
                    image_prompt = (
                        f"{protagonist_desc}, relieved expression, sitting at home, bright lighting, hopeful atmosphere, Korean apartment setting, webtoon style illustration, no text, no letters"
                        if ending_type == "good"
                        else f"{protagonist_desc}, devastated expression, head in hands, dark atmosphere, regret and despair, Korean apartment setting, webtoon style illustration, no text, no letters"
                    )
                    return GenerationResult(
                        node_type=f"ending_{ending_type}",
                        narrative_text="상황이 마무리되었습니다." if ending_type == "good" else "안타깝게도 피해가 발생했습니다.",
                        choices=[],
                        image_prompt=image_prompt,
                        reasoning=f"LLM 호출 실패, 강제 엔딩 생성 (depth={context.current_depth}): {str(e)}"
                    )

                # 폴백: 내러티브 노드 (계속 진행 가능)
                logger.warning("노드 생성 실패, 폴백 내러티브 (depth=%d): %s", context.current_depth, str(e)[:100])
                # 주인공 정보를 폴백 이미지 프롬프트에 포함
                if context.protagonist:
                    protagonist_desc = f"{context.protagonist.description}, {context.protagonist.appearance}"
                else:
                    protagonist_desc = "A middle-aged Korean person in casual clothes"
                return GenerationResult(
                    node_type="narrative",
                    narrative_text="상황이 계속되고 있습니다. 어떻게 대응하시겠습니까?",
                    choices=[
                        ChoiceResult(
                            text="신중하게 대응한다",
                            is_dangerous=False,
                            resource_effect={"trust": 0, "money": 0, "awareness": 1}
                        ),
                        ChoiceResult(
                            text="상대방의 요청을 따른다",
                            is_dangerous=True,
                            resource_effect={"trust": 1, "money": -1, "awareness": 0}
                        ),
                    ],
                    image_prompt=f"{protagonist_desc}, contemplating a decision, worried expression, modern Korean setting, tense atmosphere, webtoon style illustration, no text, no letters",
                    reasoning=f"LLM 호출 실패로 폴백 내러티브 노드 생성 (트리 확장 계속): {str(e)}"
                )
            # 지수 백오프: 1s, 2s, 4s
            delay = 1 * (2 ** attempt)
            logger.warning("노드 생성 attempt %d 실패 (depth=%d), %ds 후 재시도...", attempt + 1, context.current_depth, delay)
            await asyncio.sleep(delay)


def result_to_node(
    result: GenerationResult,
    node_id: str,
    depth: int,
    parent_node_id: str | None = None,
    parent_choice_id: str | None = None,
) -> ScenarioNode:
    """GenerationResult를 ScenarioNode로 변환"""
    choices = []
    for i, choice_result in enumerate(result.choices):
        choice_id = f"{node_id}_c{i+1}"
        # 위험 선택 피드백 변환
        feedback = None
        if choice_result.is_dangerous and choice_result.danger_feedback:
            feedback = DangerFeedback.model_validate(choice_result.danger_feedback)
        choices.append(Choice(
            id=choice_id,
            text=choice_result.text,
            is_dangerous=choice_result.is_dangerous,
            resource_effect=ResourceDelta(
                trust=max(-2, min(2, choice_result.resource_effect.get("trust", 0))),
                money=max(-2, min(2, choice_result.resource_effect.get("money", 0))),
                awareness=max(-2, min(2, choice_result.resource_effect.get("awareness", 0))),
            ),
            danger_feedback=feedback,
        ))

    return ScenarioNode(
        id=node_id,
        type=result.node_type,
        text=result.narrative_text,
        choices=choices,
        image_prompt=result.image_prompt,
        depth=depth,
        parent_node_id=parent_node_id,
        parent_choice_id=parent_choice_id,
    )
