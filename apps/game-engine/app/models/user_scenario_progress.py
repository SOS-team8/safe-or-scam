"""user_scenario_progress 컬렉션 — 유저별 시나리오 엔딩 수집 진행도."""
from datetime import datetime

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel


class UserScenarioProgress(Document):
    """(user_id, scenario_id) 복합 유니크.

    결말 **유형(ending_category)** 기준 수집 진행도.
    discovered_categories: 도달한 distinct ending_category id 목록.
    total_categories: 시나리오 결말 유형 수 (len(scenario.ending_categories)).
    completion_rate = len(discovered_categories) / total_categories.
    """

    user_id: int
    scenario_id: str
    discovered_categories: list[str] = Field(default_factory=list)
    total_categories: int
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
