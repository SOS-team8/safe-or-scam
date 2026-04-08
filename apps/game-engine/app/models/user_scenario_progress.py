"""user_scenario_progress 컬렉션 — 유저별 시나리오 엔딩 수집 진행도."""
from datetime import datetime

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel


class UserScenarioProgress(Document):
    """(user_id, scenario_id) 복합 유니크.

    total_endings는 scenarios.total_endings의 denorm.
    completion_rate = len(discovered_endings) / total_endings.
    """

    user_id: int
    scenario_id: str
    discovered_endings: list[str] = Field(default_factory=list)
    total_endings: int
    completion_rate: float = 0.0
    play_count: int = 0
    last_played_at: datetime

    class Settings:
        name = "user_scenario_progress"
        indexes = [
            IndexModel(
                [("user_id", ASCENDING), ("scenario_id", ASCENDING)],
                unique=True,
            ),
        ]
