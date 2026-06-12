"""game-engine-api v2 응답 Pydantic 모델.

응답 인코딩은 **snake_case** (FastAPI Pydantic 기본).
contract game-engine-api v2 §1 명시: `snake_case 필드 명명`.
Pydantic alias 사용 금지 (Phase 1 회귀 방지 — contract 그대로).
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models.common import (
    DangerFeedback,
    EducationalContent,
    Resources,
    ScenarioNode,
)
from app.models.game_session import ChoiceHistoryEntry


class ScenarioSummary(BaseModel):
    """game-engine-api v2 §3-1."""

    scenario_id: str
    title: str
    description: str
    phishing_type: str
    difficulty: Literal["easy", "medium", "hard"]
    total_endings: int
    total_good_endings: int
    total_bad_endings: int
    tags: list[str]


class CreateSessionRequest(BaseModel):
    """game-engine-api v2 §3-3 Request body.

    `force_new`: True면 동일 user×scenario 활성 세션을 abandoned로 표시 후 새 세션 생성.
    "처음부터" UX 지원. 기본 False는 idempotent resume.
    """

    scenario_id: str
    force_new: bool = False


class ActiveSessionResponse(BaseModel):
    """GET /game-sessions/active?scenario_id=...

    활성 세션 정보 또는 null. LobbyPage가 다이얼로그 표시 여부 판단용.
    """

    active: bool
    session: GameSessionResponse | None = None


class MoveRequest(BaseModel):
    """game-engine-api v2 §3-4 Request body."""

    choice_id: str


class GameSessionResponse(BaseModel):
    """game-engine-api v2 §3-3 Response (세션 생성 시).

    `current_node` 객체 포함 (ADR-001).
    """

    session_id: str
    scenario_id: str
    user_id: int
    current_node_id: str
    current_node: ScenarioNode
    resources: Resources
    status: Literal["playing", "completed", "abandoned"]
    dangerous_count: int
    choices_history: list[ChoiceHistoryEntry]
    started_at: datetime
    completed_at: datetime | None = None


class MoveResponse(BaseModel):
    """game-engine-api v2 §3-4 Response.

    /move, /undo, GET /{id} 모두 동일 shape. 단 GET /{id} 와 /undo 응답에서
    `danger_feedback`/`educational_content` 는 항상 null (이전 move 정보 보존하지 않음).
    """

    session_id: str
    scenario_id: str
    current_node_id: str
    current_node: ScenarioNode
    resources: Resources
    status: Literal["playing", "completed", "abandoned"]
    dangerous_count: int
    choices_history: list[ChoiceHistoryEntry]
    danger_feedback: DangerFeedback | None = None
    educational_content: EducationalContent | None = None
    is_finished: bool
    ending_type: Literal["ending_good", "ending_bad"] | None = None
    ending_category: str | None = None
    started_at: datetime
    completed_at: datetime | None = None


class ScenarioProgressResponse(BaseModel):
    """internal: GET /api/internal/progress/{user_id} 응답 항목.

    결말 **유형(ending_category)** 기준 수집 진행도. 유저가 결말 1개 이상 도달한
    시나리오만 (progress 문서 존재 = finalize 발생). snake_case 유지 (contract, alias 금지).
    discovered_category_count 는 계산값(len(discovered_categories)).
    """

    scenario_id: str
    completion_rate: float
    discovered_category_count: int
    total_categories: int
    last_played_at: datetime

class PlayLogSummaryResponse(BaseModel):
    """internal: GET /api/internal/play-logs/user/{user_id}?scenario_id={id} 응답
    
    전부 play_log denorm — 시나리오 join 불필요. completed_at desc 정렬은 라우트 책임.
    """

    log_id: str
    ending_type: Literal["ending_good", "ending_bad"]
    total_score: int
    dangerous_count: int
    duration_seconds: int
    completed_at: datetime


class EndingCategoryView(BaseModel):
    """결말 카테고리 표시용. ending_classifier 미실행 시 None."""

    label: str
    description: str


class PlayLogDetailResponse(BaseModel):
    """internal: GET /api/internal/play-logs/{log_id}?user_id={userId} 응답

    사진 + 결말 요약만. final_resource·플레이 스탯 제외 (play_log 에 denorm 돼 있어 추후 필요 시 무비용 추가). 식별자 + 결말 콘텐츠.
    """

    log_id: str
    scenario_id: str
    image_url: str | None = None
    text: str
    ending_category: EndingCategoryView | None = None