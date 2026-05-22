"""scenarios 라우트 (game-engine-api v2 §3-1, §3-2).

- GET /api/v1/scenarios : ScenarioSummary 목록 (페이로드 절감 — nodes 미포함)
- GET /api/v1/scenarios/{scenario_id} : Scenario 전체 (nodes + ending_categories 포함)
"""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import get_current_user
from app.models.scenario import Scenario
from app.schemas.game import ScenarioSummary

router = APIRouter(tags=["scenarios"])


@router.get(
    "/scenarios",
    response_model=list[ScenarioSummary],
    summary="시나리오 목록 (로비)",
)
async def list_scenarios(
    difficulty: Literal["easy", "medium", "hard"] | None = Query(None),
    phishing_type: str | None = Query(None),
    _user: dict = Depends(get_current_user),
) -> list[ScenarioSummary]:
    query: dict = {}
    if difficulty:
        query["difficulty"] = difficulty
    if phishing_type:
        query["phishing_type"] = phishing_type

    cursor = Scenario.find(query) if query else Scenario.find_all()
    scenarios = await cursor.to_list()

    return [
        ScenarioSummary(
            scenario_id=s.scenario_id,
            title=s.title,
            description=s.description,
            phishing_type=s.phishing_type,
            difficulty=s.difficulty,
            total_endings=s.total_endings,
            total_good_endings=s.total_good_endings,
            total_bad_endings=s.total_bad_endings,
            tags=s.tags,
        )
        for s in scenarios
    ]


@router.get(
    "/scenarios/{scenario_id}",
    response_model=Scenario,
    summary="시나리오 상세 (트리 전체)",
)
async def get_scenario(
    scenario_id: str,
    _user: dict = Depends(get_current_user),
) -> Scenario:
    scenario = await Scenario.find_one(Scenario.scenario_id == scenario_id)
    if scenario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    return scenario
