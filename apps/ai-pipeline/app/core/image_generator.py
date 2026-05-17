"""이미지 생성 모듈 (Google Imagen via Vertex AI)"""
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
IMAGES_DIR = Path(__file__).parent.parent / "data" / "images"


def _generate_image_sync(
    prompt: str,
    node_id: str,
    scenario_id: str | None = None,
    seed: int | None = None
) -> str | None:
    """
    동기 이미지 생성 (스레드에서 실행, 지수 백오프 재시도)
    
    Args:
        prompt: 이미지 생성 프롬프트
        node_id: 노드 ID
        scenario_id: 시나리오 ID (파일명 및 seed 생성에 사용)
        seed: 이미지 생성 seed (동일 seed = 동일 스타일). None이면 scenario_id에서 생성
    """
    if not settings.gcp_project_id:
        logger.warning("Image generation skipped: GCP_PROJECT_ID not configured")
        return None

    # 서비스 계정 인증 설정
    if settings.google_application_credentials:
        creds_path = Path(__file__).parent.parent.parent / settings.google_application_credentials
        if creds_path.exists():
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(creds_path)
        else:
            logger.error(f"Credentials file not found: {creds_path}")
            return None

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # seed 계산: 시나리오별로 고정된 seed 사용 (인물 일관성 보장)
    if seed is None and scenario_id:
        # scenario_id의 해시값을 seed로 사용 (1 ~ 2^31-1 범위)
        seed = hash(scenario_id) % 2147483647
        if seed <= 0:
            seed = abs(seed) + 1
        logger.debug(f"[{node_id}] Using seed={seed} for scenario {scenario_id}")

    max_retries = settings.image_retry_count
    base_delay = settings.image_retry_delay

    for attempt in range(max_retries + 1):
        try:
            # Vertex AI 모드로 클라이언트 생성
            client = genai.Client(
                vertexai=True,
                project=settings.gcp_project_id,
                location=settings.gcp_location,
            )

            # seed 사용 시 add_watermark=False, enhance_prompt=False 필수
            config = types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="16:9",
                person_generation="ALLOW_ADULT",
                seed=seed,
                add_watermark=False,
                enhance_prompt=False,
            )

            response = client.models.generate_images(
                model=settings.image_model,
                prompt=prompt,
                config=config,
            )

            if not response.generated_images:
                logger.warning(f"[{node_id}] Image generation returned no images")
                return None

            # 이미지 저장 (경로: images/{scenario_id}/{node_id}.png)
            image = response.generated_images[0].image
            if scenario_id:
                # 시나리오별 폴더 생성
                scenario_dir = IMAGES_DIR / scenario_id
                scenario_dir.mkdir(parents=True, exist_ok=True)
                filename = f"{node_id}.png"
                filepath = scenario_dir / filename
                url_path = f"/api/v1/images/{scenario_id}/{filename}"
            else:
                filename = f"{node_id}_{uuid4().hex[:8]}.png"
                filepath = IMAGES_DIR / filename
                url_path = f"/api/v1/images/{filename}"

            # PIL Image를 파일로 저장
            image.save(str(filepath))
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
