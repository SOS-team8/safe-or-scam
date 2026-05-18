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
