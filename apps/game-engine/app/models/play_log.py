"""play_logs 컬렉션 — 완료된 플레이의 영구 기록."""
from datetime import datetime
from typing import Literal

from beanie import Document
from pymongo import ASCENDING, DESCENDING, IndexModel

from app.models.common import Resources


class PlayLog(Document):
    """완료된 게임 한 판의 축약 기록.

    path는 0-based choice index 배열. root + path 있으면 경로 복원 가능.
    """

    log_id: str  # business key (UUID)
    scenario_id: str
    user_id: int
    path: list[int]  # e.g. [2, 1, 0] → root의 choices[2] → 그 다음 choices[1] → ...
    final_node_id: str
    ending_type: Literal["ending_good", "ending_bad"]
    final_resource: Resources
    total_score: int
    dangerous_count: int
    total_choices: int
    phishing_type: str  # scenarios에서 denorm (조회 편의)
    duration_seconds: int
    completed_at: datetime

    class Settings:
        name = "play_logs"
        indexes = [
            IndexModel([("log_id", ASCENDING)], unique=True),
            IndexModel([("user_id", ASCENDING), ("scenario_id", ASCENDING)]),
            IndexModel([("completed_at", DESCENDING)]),
        ]
