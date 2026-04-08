"""scenarios 컬렉션 — beanie Document."""
from datetime import datetime
from typing import Literal

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.common import ProtagonistProfile, ScenarioNode


class Scenario(Document):
    """시나리오 트리 전체.

    JSON 파일 그대로 embed. nodes는 dict[node_id, ScenarioNode].
    문서당 크기 ~700-850KB (6개 시나리오 기준). Mongo 16MB 한계 대비 안전.
    """

    scenario_id: str  # business key (JSON `id` 매핑)
    title: str
    description: str
    phishing_type: str
    difficulty: Literal["easy", "medium", "hard"]
    root_node_id: str
    nodes: dict[str, ScenarioNode]
    protagonist: ProtagonistProfile | None = None
    prologue: str | None = None

    # 파생 필드 (시드 또는 ai-pipeline에서 계산해 주입)
    total_endings: int
    total_good_endings: int
    total_bad_endings: int

    tags: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Settings:
        name = "scenarios"
        indexes = [
            IndexModel([("scenario_id", ASCENDING)], unique=True),
            IndexModel([("phishing_type", ASCENDING)]),
            IndexModel([("difficulty", ASCENDING)]),
        ]
