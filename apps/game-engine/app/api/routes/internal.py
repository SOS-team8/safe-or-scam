"""internal 라우트 — backend → game-engine 서비스 간 호출 전용.

라우터 전체에 X-Internal-Api-Key 검증. main.py 에서 include_in_schema=False.
get_current_user 미사용 — 호출자는 backend 서비스, 사용자 신원은 backend 가 JWT 로 검증.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.internal_auth import verify_internal_api_key
from app.models.user_scenario_progress import UserScenarioProgress
from app.schemas.game import ScenarioProgressResponse

router = APIRouter(
    tags=["internal"],
    dependencies=[Depends(verify_internal_api_key)],
)


@router.get(
    "/progress/{user_id}",
    response_model=list[ScenarioProgressResponse],
    summary="유저 시나리오별 결말 수집 진행도 목록 (internal)",
)
async def list_user_progress(user_id: int) -> list[ScenarioProgressResponse]:
    # 결말 1개+ 도달한 시나리오만 (progress 문서 존재). 미플레이/abandoned 는 없음 → 빈 목록.
    # N(유저가 도달한 시나리오 수)이 작아 last_played_at 무인덱스 sort 허용.
    rows = (
        await UserScenarioProgress.find(UserScenarioProgress.user_id == user_id)
        .sort("-last_played_at")
        .to_list()
    )
    return [
        ScenarioProgressResponse(
            scenario_id=r.scenario_id,
            completion_rate=r.completion_rate,
            discovered_count=len(r.discovered_endings),
            total_endings=r.total_endings,
            last_played_at=r.last_played_at,
        )
        for r in rows
    ]