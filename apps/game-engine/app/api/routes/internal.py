"""internal 라우트 — backend → game-engine 서비스 간 호출 전용.

라우터 전체에 X-Internal-Api-Key 검증. main.py 에서 include_in_schema=False.
get_current_user 미사용 — 호출자는 backend 서비스, 사용자 신원은 backend 가 JWT 로 검증.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.internal_auth import verify_internal_api_key
from app.models.play_log import PlayLog
from app.models.scenario import Scenario
from app.models.user_scenario_progress import UserScenarioProgress
from app.schemas.game import (
    EndingCategoryView,
    PlayLogDetailResponse,
    PlayLogSummaryResponse,
    ScenarioProgressResponse,
)

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


@router.get(
    "/play-logs/user/{user_id}",
    response_model=list[PlayLogSummaryResponse],
    summary="유저 시나리오별 플레이 기록 목록 (internal)",
)
async def list_user_play_logs(
    user_id: int,
    scenario_id: str,
) -> list[PlayLogSummaryResponse]:
    # 완료(ending 도달) 기록만 play_logs 에 존재. (user_id, scenario_id) 복합인덱스 조회.
    rows = (
        await PlayLog.find(
            PlayLog.user_id == user_id,
            PlayLog.scenario_id == scenario_id,
        )
        .sort("-completed_at")
        .to_list()
    )
    return [
        PlayLogSummaryResponse(
            log_id=r.log_id,
            ending_type=r.ending_type,
            total_score=r.total_score,
            dangerous_count=r.dangerous_count,
            duration_seconds=r.duration_seconds,
            completed_at=r.completed_at,
        )
        for r in rows
    ]


@router.get(
    "/play-logs/{log_id}",
    response_model=PlayLogDetailResponse,
    summary="플레이 기록 상세 — 결말 (internal)",
)
async def get_play_log_detail(
    log_id: str,
    user_id: int,
) -> PlayLogDetailResponse:
    # business key 조회는 find_one (Model.get() 은 _id 조회라 항상 None).
    log = await PlayLog.find_one(PlayLog.log_id == log_id)
    # 존재 안 함 / 타인 소유 모두 404 (존재 비노출, 403 아님).
    if log is None or log.user_id != user_id:
        raise HTTPException(status_code=404, detail="Play log not found")

    scenario = await Scenario.find_one(Scenario.scenario_id == log.scenario_id)
    node = scenario.nodes.get(log.final_node_id) if scenario else None
    # 시나리오/노드 부재(하드삭제·in-place 재발행) → 결말 콘텐츠 없음 → 404.
    if scenario is None or node is None:
        raise HTTPException(status_code=404, detail="Ending content not found")

    # 카테고리: ending_categories·node.ending_category 둘 다 존재 + dangling 아닐 때만.
    category: EndingCategoryView | None = None
    if scenario.ending_categories and node.ending_category:
        cat = scenario.ending_categories.get(node.ending_category)
        if cat is not None:
            category = EndingCategoryView(label=cat.label, description=cat.description)

    return PlayLogDetailResponse(
        log_id=log.log_id,
        scenario_id=log.scenario_id,
        image_url=node.image_url,
        text=node.text,
        ending_category=category,
    )