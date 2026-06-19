"""game-sessions 라우트 (game-engine-api v2 §3-3 ~ §3-6).

- POST   /api/v1/game-sessions             : 세션 생성
- POST   /api/v1/game-sessions/{id}/move   : 선택지 이동
- GET    /api/v1/game-sessions/{id}        : 세션 상태 조회
- POST   /api/v1/game-sessions/{id}/undo   : 직전 선택 되돌리기 (선택)
"""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.auth import get_current_user
from app.core.backend_client import GameCompletedPayload, notify_game_completed
from app.models.common import Resources
from app.models.game_session import GameSession
from app.models.play_log import PlayLog
from app.models.scenario import Scenario
from app.models.user_scenario_progress import UserScenarioProgress
from app.schemas.game import (
    ActiveSessionResponse,
    CreateSessionRequest,
    GameSessionResponse,
    MoveRequest,
    MoveResponse,
    UnlockedAchievementView,
)
from app.services.game_logic import (
    InvalidChoiceError,
    process_choice,
    undo_last_choice,
)

router = APIRouter(tags=["game-sessions"])


# -------- helpers --------


def _build_game_session_response(
    session: GameSession,
    scenario: Scenario,
) -> GameSessionResponse:
    current_node = scenario.nodes[session.current_node_id]
    return GameSessionResponse(
        session_id=session.session_id,
        scenario_id=session.scenario_id,
        user_id=session.user_id,
        current_node_id=session.current_node_id,
        current_node=current_node,
        resources=session.resources,
        status=session.status,
        dangerous_count=session.dangerous_count,
        choices_history=session.choices_history,
        started_at=session.started_at,
        completed_at=session.completed_at,
    )


def _build_move_response(
    session: GameSession,
    scenario: Scenario,
    *,
    danger_feedback=None,
    educational_content=None,
    is_finished: bool = False,
    ending_type=None,
    ending_category: str | None = None,
    unlocked_achievements: list[UnlockedAchievementView] | None = None,
) -> MoveResponse:
    current_node = scenario.nodes[session.current_node_id]
    return MoveResponse(
        session_id=session.session_id,
        scenario_id=session.scenario_id,
        current_node_id=session.current_node_id,
        current_node=current_node,
        resources=session.resources,
        status=session.status,
        dangerous_count=session.dangerous_count,
        choices_history=session.choices_history,
        danger_feedback=danger_feedback,
        educational_content=educational_content,
        is_finished=is_finished,
        ending_type=ending_type,
        ending_category=ending_category,
        unlocked_achievements=unlocked_achievements or [],
        started_at=session.started_at,
        completed_at=session.completed_at,
    )


async def _finalize_ending(
    session: GameSession,
    scenario: Scenario,
    final_node_id: str,
    ending_type: str,
    now: datetime,
) -> GameCompletedPayload:
    """ending 도달 시 부가 처리:
    1. session.status = "completed" 를 먼저 persist
       (이후 문서 쓰기가 실패해도 세션이 playing 으로 남지 않게 → 이어하기 재완료로 인한 중복 집계 방지)
    2. PlayLog insert
    3. UserScenarioProgress upsert

    backend 통계 동기화 발신용 payload 를 반환한다(HTTP 발신은 호출자 책임).
    """
    session.status = "completed"
    session.completed_at = now
    if final_node_id not in session.visited_endings:
        session.visited_endings.append(final_node_id)

    # completed 세션을 먼저 확정. 이후 PlayLog/progress 쓰기가 실패해도 세션이
    # playing 이 아니므로 이어하기 대상에서 빠져 재 finalize(중복 집계)가 막힌다.
    # 대가: 후속 쓰기 실패 시 그 판 기록 1회 유실 — 중복보다 안전한 트레이드오프.
    await session.save()

    # 1) path 계산 (choices_history -> 각 node 의 choice index)
    path: list[int] = []
    cur_id = scenario.root_node_id
    for entry in session.choices_history:
        node = scenario.nodes.get(cur_id)
        if node is None:
            break
        idx = next(
            (i for i, c in enumerate(node.choices) if c.id == entry.choice_id),
            None,
        )
        if idx is None:
            break
        path.append(idx)
        nxt = node.choices[idx].next_node_id
        if nxt is None:
            break
        cur_id = nxt

    started_at = session.started_at
    if started_at.tzinfo is None:
        # MongoDB 는 naive datetime 으로 저장 (UTC 의미). subtract 시 일관성 유지.
        started_at = started_at.replace(tzinfo=UTC)
    duration_seconds = max(0, int((now - started_at).total_seconds()))
    total_score = max(
        0, session.resources.trust + session.resources.money + session.resources.awareness
    ) * 10

    # Mongo log_id 와 backend play_log_id 를 동일 값으로 (멱등 정합)
    log_id = uuid4().hex
    play_log = PlayLog(
        log_id=log_id,
        scenario_id=session.scenario_id,
        user_id=session.user_id,
        path=path,
        final_node_id=final_node_id,
        ending_type=ending_type,  # type: ignore[arg-type]
        final_resource=session.resources,
        total_score=total_score,
        dangerous_count=session.dangerous_count,
        total_choices=len(session.choices_history),
        phishing_type=scenario.phishing_type,
        duration_seconds=duration_seconds,
        completed_at=now,
    )
    await play_log.insert()

    # 2) progress upsert (결말 유형 category 기준)
    #    도달 노드의 ending_category 를 수집. 분모 = 시나리오 결말 유형 수.
    #    ending_categories 미분류(None)거나 dangling 카테고리면 수집 제외(rate 0 폴백).
    final_node = scenario.nodes.get(final_node_id)
    category_id = final_node.ending_category if final_node else None
    ending_categories = scenario.ending_categories or {}
    total_categories = len(ending_categories)
    is_valid_category = bool(category_id and category_id in ending_categories)

    existing_progress = await UserScenarioProgress.find_one(
        UserScenarioProgress.user_id == session.user_id,
        UserScenarioProgress.scenario_id == session.scenario_id,
    )
    if existing_progress is None:
        discovered = [category_id] if is_valid_category else []
        completion_rate = (
            len(discovered) / total_categories if total_categories > 0 else 0.0
        )
        progress = UserScenarioProgress(
            user_id=session.user_id,
            scenario_id=session.scenario_id,
            discovered_categories=discovered,
            total_categories=total_categories,
            completion_rate=completion_rate,
            play_count=1,
            last_played_at=now,
        )
        await progress.insert()
    else:
        if (
            is_valid_category
            and category_id not in existing_progress.discovered_categories
        ):
            existing_progress.discovered_categories.append(category_id)
        existing_progress.total_categories = total_categories
        completion_rate = (
            len(existing_progress.discovered_categories) / total_categories
            if total_categories > 0
            else 0.0
        )
        existing_progress.completion_rate = completion_rate
        existing_progress.play_count += 1
        existing_progress.last_played_at = now
        await existing_progress.save()

    # 3) backend 발신용 payload (HTTP 발신은 move 핸들러가 best-effort 로 수행)
    return GameCompletedPayload(
        play_log_id=log_id,
        user_id=session.user_id,
        scenario_id=session.scenario_id,
        session_id=session.session_id,
        ending_type=ending_type,
        final_node_id=final_node_id,
        completion_rate=completion_rate,
        total_score=total_score,
        dangerous_count=session.dangerous_count,
        duration_seconds=duration_seconds,
        completed_at=now.isoformat(),
    )


# -------- routes --------


@router.post(
    "/game-sessions",
    response_model=GameSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="새 게임 세션 생성",
)
async def create_session(
    body: CreateSessionRequest,
    user: dict = Depends(get_current_user),
) -> GameSessionResponse:
    user_id = user["user_id"]
    scenario = await Scenario.find_one(Scenario.scenario_id == body.scenario_id)
    if scenario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found"
        )

    # 활성 세션 처리.
    # - force_new=False (기본): idempotent resume — 활성 세션 그대로 반환.
    # - force_new=True ("처음부터"): 기존 활성 세션을 abandoned로 표시 후 새 세션 생성.
    #   abandoned 세션의 play_logs/progress는 아직 ending 미도달이라 비어있음 (자연 폐기).
    existing = await GameSession.find_one(
        GameSession.user_id == user_id,
        GameSession.scenario_id == body.scenario_id,
        GameSession.status == "playing",
    )
    if existing is not None:
        if body.force_new:
            existing.status = "abandoned"
            existing.completed_at = datetime.now(UTC)
            await existing.save()
        else:
            current_node = scenario.nodes.get(existing.current_node_id)
            if current_node is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Session points to missing node",
                )
            return GameSessionResponse(
                session_id=existing.session_id,
                scenario_id=existing.scenario_id,
                user_id=existing.user_id,
                current_node_id=existing.current_node_id,
                current_node=current_node,
                resources=existing.resources,
                status=existing.status,
                dangerous_count=existing.dangerous_count,
                choices_history=existing.choices_history,
                started_at=existing.started_at,
                completed_at=existing.completed_at,
            )

    now = datetime.now(UTC)
    session = GameSession(
        session_id=uuid4().hex,
        scenario_id=body.scenario_id,
        user_id=user_id,
        current_node_id=scenario.root_node_id,
        resources=Resources(),  # default 3/3/1
        choices_history=[],
        dangerous_count=0,
        visited_endings=[],
        status="playing",
        started_at=now,
        completed_at=None,
    )
    await session.insert()

    return _build_game_session_response(session, scenario)


@router.get(
    "/game-sessions/active",
    response_model=ActiveSessionResponse,
    summary="활성 세션 조회 (LobbyPage 다이얼로그용)",
)
async def get_active_session(
    scenario_id: str,
    user: dict = Depends(get_current_user),
) -> ActiveSessionResponse:
    """동일 user×scenario의 status=playing 세션이 있으면 반환, 없으면 active=false."""
    user_id = user["user_id"]
    existing = await GameSession.find_one(
        GameSession.user_id == user_id,
        GameSession.scenario_id == scenario_id,
        GameSession.status == "playing",
    )
    if existing is None:
        return ActiveSessionResponse(active=False, session=None)
    scenario = await Scenario.find_one(Scenario.scenario_id == scenario_id)
    if scenario is None:
        return ActiveSessionResponse(active=False, session=None)
    current_node = scenario.nodes.get(existing.current_node_id)
    if current_node is None:
        return ActiveSessionResponse(active=False, session=None)
    return ActiveSessionResponse(
        active=True,
        session=GameSessionResponse(
            session_id=existing.session_id,
            scenario_id=existing.scenario_id,
            user_id=existing.user_id,
            current_node_id=existing.current_node_id,
            current_node=current_node,
            resources=existing.resources,
            status=existing.status,
            dangerous_count=existing.dangerous_count,
            choices_history=existing.choices_history,
            started_at=existing.started_at,
            completed_at=existing.completed_at,
        ),
    )


@router.get(
    "/game-sessions/{session_id}",
    response_model=MoveResponse,
    summary="세션 상태 조회",
)
async def get_session(
    session_id: str,
    user: dict = Depends(get_current_user),
) -> MoveResponse:
    user_id = user["user_id"]
    session = await GameSession.find_one(
        GameSession.session_id == session_id,
        GameSession.user_id == user_id,
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    scenario = await Scenario.find_one(Scenario.scenario_id == session.scenario_id)
    if scenario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found"
        )

    current_node = scenario.nodes.get(session.current_node_id)
    is_finished = current_node is not None and current_node.type.startswith(
        "ending_"
    )
    ending_type = current_node.type if is_finished else None  # type: ignore[assignment]
    ending_category = (
        current_node.ending_category if is_finished and current_node else None
    )

    return _build_move_response(
        session,
        scenario,
        is_finished=is_finished,
        ending_type=ending_type,
        ending_category=ending_category,
    )


@router.post(
    "/game-sessions/{session_id}/move",
    response_model=MoveResponse,
    summary="선택지 이동",
)
async def make_move(
    session_id: str,
    body: MoveRequest,
    user: dict = Depends(get_current_user),
) -> MoveResponse:
    user_id = user["user_id"]
    session = await GameSession.find_one(
        GameSession.session_id == session_id,
        GameSession.user_id == user_id,
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    if session.status != "playing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not active",
        )

    scenario = await Scenario.find_one(Scenario.scenario_id == session.scenario_id)
    if scenario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found"
        )

    now = datetime.now(UTC)
    try:
        result = await process_choice(session, scenario, body.choice_id, now=now)
    except InvalidChoiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e

    payload: GameCompletedPayload | None = None
    if result.is_finished:
        assert result.ending_type is not None
        payload = await _finalize_ending(
            session,
            scenario,
            final_node_id=session.current_node_id,
            ending_type=result.ending_type,
            now=now,
        )
    else:
        await session.save()

    # backend 통계 동기화 — 결말 도달 시 동기 호출로 새로 달성한 업적을 받아 응답에 싣는다.
    # best-effort: notify_game_completed 가 모든 예외를 흡수하고 []를 반환하므로 backend
    # 장애/지연이 있어도 게임 완료 응답 자체는 항상 성공한다(엔딩은 정상 표시).
    unlocked: list[UnlockedAchievementView] = []
    if payload is not None:
        unlocked = await notify_game_completed(payload)

    return _build_move_response(
        session,
        scenario,
        danger_feedback=result.danger_feedback,
        educational_content=result.educational_content,
        is_finished=result.is_finished,
        ending_type=result.ending_type,
        ending_category=result.ending_category,
        unlocked_achievements=unlocked,
    )


@router.post(
    "/game-sessions/{session_id}/undo",
    response_model=MoveResponse,
    summary="직전 선택 되돌리기",
)
async def undo_move(
    session_id: str,
    user: dict = Depends(get_current_user),
) -> MoveResponse:
    user_id = user["user_id"]
    session = await GameSession.find_one(
        GameSession.session_id == session_id,
        GameSession.user_id == user_id,
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    scenario = await Scenario.find_one(Scenario.scenario_id == session.scenario_id)
    if scenario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found"
        )

    try:
        await undo_last_choice(session, scenario)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e

    await session.save()

    return _build_move_response(
        session,
        scenario,
        is_finished=False,
        ending_type=None,
        ending_category=None,
    )
