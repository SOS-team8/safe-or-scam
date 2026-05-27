"""이미지 생성 모듈 (Google Gemini 3.1 Flash Image / Nano Banana 2 via Gemini API).

#53 — Imagen 4 family 가 2026-06 EOL 예정이라 Nano Banana 2 (model id:
`gemini-3.1-flash-image-preview`) 로 교체. 텍스트 렌더링이 SOTA 라 UI mockup
이미지 안의 영문 라벨/숫자가 깨지지 않는다.

호출 채널: Vertex AI 가 아닌 **Gemini API (ai.google.dev)** — Preview 모델은
Vertex AI 의 publisher endpoint 가 아직 모든 프로젝트에 풀려있지 않아 404 가
발생하지만, Gemini API 는 GEMINI_API_KEY 만 있으면 바로 호출 가능. 운영(Cloud
Run) 단계에서 Vertex AI 로 옮길 일이 생기면 그때 vertexai=True 모드로 다시
스위치 (코드 한 줄 분기).

SDK 호출 패턴이 Imagen 의 generate_images 가 아니라 Gemini 의 generate_content
(response_modalities=["TEXT","IMAGE"]) 라 응답 형태가 다르다. 시나리오별 seed
옵션은 generate_content 에 노출돼 있지 않아 제거 — 인물 일관성은 prompt 안의
protagonist description/appearance 강제 포함으로 보장 (Nano Banana 2 의
character consistency 가 우수).
"""
import asyncio
import logging
import os
import time
from pathlib import Path
from uuid import uuid4
from functools import partial

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger("core.image_generator")
# settings.images_dir 에서 단일 진실 (#51) — main.py 의 StaticFiles mount 와
# 항상 동일한 디렉토리를 가리키도록 통일.
IMAGES_DIR = Path(settings.images_dir)


def _generate_image_sync(
    prompt: str,
    node_id: str,
    scenario_id: str | None = None,
    seed: int | None = None,  # 호환을 위한 인자, Gemini 호출에서는 미사용
) -> str | None:
    """동기 이미지 생성 (스레드에서 실행, 지수 백오프 재시도).

    Args:
        prompt: 이미지 생성 프롬프트 (영문)
        node_id: 노드 ID (파일명에 사용)
        scenario_id: 시나리오 ID (파일명 prefix)
        seed: 호환 인자 — Nano Banana 2 호출에서는 무시
    """
    if not settings.gemini_api_key:
        logger.warning("Image generation skipped: GEMINI_API_KEY not configured")
        return None

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    max_retries = settings.image_retry_count
    base_delay = settings.image_retry_delay

    # 16:9 widescreen 은 prompt 안에 명시 (Gemini generate_content 에 aspect_ratio
    # 옵션이 직접 노출돼 있지 않다).
    framed_prompt = (
        f"Generate a 16:9 widescreen webtoon illustration.\n\n{prompt}"
    )

    for attempt in range(max_retries + 1):
        try:
            # Gemini API 직접 호출 (Vertex AI 가 아님 — preview 모델이 Vertex 에서
            # 일부 프로젝트에 풀려있지 않아 404 가 나는 회귀를 회피).
            client = genai.Client(api_key=settings.gemini_api_key)

            response = client.models.generate_content(
                model=settings.image_model,
                contents=[framed_prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                ),
            )

            # response 에서 image bytes 추출 (parts 중 inline_data 보유한 part)
            image_bytes: bytes | None = None
            for candidate in response.candidates or []:
                content = getattr(candidate, "content", None)
                if not content or not getattr(content, "parts", None):
                    continue
                for part in content.parts:
                    inline = getattr(part, "inline_data", None)
                    if inline and getattr(inline, "data", None):
                        image_bytes = inline.data
                        break
                if image_bytes:
                    break

            if not image_bytes:
                logger.warning(f"[{node_id}] No image bytes in response")
                return None

            # 저장 경로 (Imagen 시절과 동일 — 기존 publish_scenario.sh 호환).
            if scenario_id:
                scenario_dir = IMAGES_DIR / scenario_id
                scenario_dir.mkdir(parents=True, exist_ok=True)
                filename = f"{node_id}.png"
                filepath = scenario_dir / filename
                url_path = f"/api/v1/images/{scenario_id}/{filename}"
            else:
                filename = f"{node_id}_{uuid4().hex[:8]}.png"
                filepath = IMAGES_DIR / filename
                url_path = f"/api/v1/images/{filename}"

            with open(filepath, "wb") as f:
                f.write(image_bytes)
            logger.info(f"[{node_id}] Image saved: {filepath}")
            return url_path

        except Exception as e:
            error_str = str(e)
            is_quota_error = "RESOURCE_EXHAUSTED" in error_str or "429" in error_str
            is_safety_error = "SAFETY" in error_str or "blocked" in error_str.lower()

            if is_safety_error:
                # 안전 필터 차단은 재시도해도 동일하므로 즉시 실패 처리
                logger.warning(f"[{node_id}] Image blocked by safety filter, skipping")
                return None

            if attempt < max_retries:
                # 지수 백오프: 2s, 4s, 8s
                delay = base_delay * (2 ** attempt)
                if is_quota_error:
                    # 할당량 초과 시 추가 대기
                    delay = delay * 2
                    logger.warning(f"[{node_id}] Quota exhausted, waiting {delay:.1f}s...")
                else:
                    logger.warning(f"[{node_id}] Attempt {attempt + 1}/{max_retries + 1} failed: {e}")
                time.sleep(delay)
            else:
                logger.error(f"[{node_id}] Image generation failed after {max_retries + 1} attempts: {e}")
                return None

    return None


async def generate_image(
    prompt: str,
    node_id: str,
    scenario_id: str | None = None,
    seed: int | None = None
) -> str | None:
    """
    비동기 이미지 생성 (스레드풀 사용)
    
    Args:
        prompt: 이미지 생성 프롬프트
        node_id: 노드 ID
        scenario_id: 시나리오 ID (파일명 및 seed 생성에 사용)
        seed: 이미지 생성 seed (동일 seed = 동일 스타일)
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, partial(_generate_image_sync, prompt, node_id, scenario_id, seed)
    )


async def generate_images_for_nodes(
    nodes: dict, max_concurrent: int | None = None
) -> dict[str, str]:
    """
    여러 노드의 이미지를 순차적으로 생성 (할당량 초과 방지)

    - 설정된 max_concurrent 사용 (기본 1 = 순차 처리)
    - 각 요청 사이에 딜레이 추가
    - 개별 이미지 생성에서 지수 백오프 재시도 적용
    """
    if max_concurrent is None:
        max_concurrent = settings.image_max_concurrent

    semaphore = asyncio.Semaphore(max_concurrent)
    results: dict[str, str] = {}
    delay_between_requests = settings.image_retry_delay

    # 생성할 노드 목록
    nodes_to_generate = [
        (node_id, node["image_prompt"])
        for node_id, node in nodes.items()
        if node.get("image_prompt") and not node.get("image_url")
    ]

    total = len(nodes_to_generate)
    print(f"Starting image generation for {total} nodes (max_concurrent={max_concurrent})")

    async def gen_with_limit(index: int, node_id: str, prompt: str):
        async with semaphore:
            # 첫 번째 요청이 아니면 딜레이 추가
            if index > 0:
                await asyncio.sleep(delay_between_requests)

            print(f"[{index + 1}/{total}] Generating image for {node_id}...")
            url = await generate_image(prompt, node_id)
            if url:
                results[node_id] = url
                print(f"[{index + 1}/{total}] Success: {node_id}")
            else:
                print(f"[{index + 1}/{total}] Failed: {node_id}")

    # 순차 처리 (max_concurrent=1) 시 효율적으로 처리
    if max_concurrent == 1:
        for i, (node_id, prompt) in enumerate(nodes_to_generate):
            await gen_with_limit(i, node_id, prompt)
    else:
        # 병렬 처리 시 세마포어로 제한
        tasks = [
            gen_with_limit(i, node_id, prompt)
            for i, (node_id, prompt) in enumerate(nodes_to_generate)
        ]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    print(f"Image generation complete: {len(results)}/{total} succeeded")
    return results
