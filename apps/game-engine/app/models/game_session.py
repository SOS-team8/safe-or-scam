"""game_sessions 컬렉션 — 진행 중/완료된 게임 세션."""
from datetime import datetime
from typing import Literal

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel

from app.models.common import Resources


class ChoiceHistoryEntry(BaseModel):
    """세션 내 선택 기록 한 건."""

    node_id: str
    choice_id: str
    is_dangerous: bool
    timestamp: datetime


class GameSession(Document):
    """유저의 단일 플레이 세션.

    진행 중 상태는 향후 Redis에 캐시될 수 있으나, 영속화는 Mongo.
    """

    session_id: str  # business key (UUID)
    scenario_id: str
    user_id: int  # Postgres users.id
    current_node_id: str
    resources: Resources = Field(default_factory=Resources)
    choices_history: list[ChoiceHistoryEntry] = Field(default_factory=list)
    dangerous_count: int = 0
    visited_endings: list[str] = Field(default_factory=list)
    status: Literal["playing", "completed", "abandoned"] = "playing"
    started_at: datetime
    completed_at: datetime | None = None

    class Settings:
        name = "game_sessions"
        indexes = [
            IndexModel([("session_id", ASCENDING)], unique=True),
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("scenario_id", ASCENDING)]),
            IndexModel(
                [
                    ("user_id", ASCENDING),
                    ("scenario_id", ASCENDING),
                    ("status", ASCENDING),
                ]
            ),
        ]
