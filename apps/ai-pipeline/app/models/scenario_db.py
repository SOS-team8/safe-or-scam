"""Scenario Beanie Document 미러 (game-engine과 동일 스키마, scenario-tree v2).

contract `scenario-tree.md` v2 §1 그대로. game-engine의
`apps/game-engine/app/models/scenario.py::Scenario`와 필드·인덱스·`Settings.name` 동일.

writer: ai-pipeline (tree_builder.py upsert).
reader: game-engine, ai-pipeline.
"""
from datetime import datetime
from typing import ClassVar, Literal

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.scenario import (
    EndingCategory,
    ProtagonistProfile,
    ScenarioNode,
)


class Scenario(Document):
    """시나리오 트리 (collection: scenarios).

    upsert key: `scenario_id` (unique 인덱스).
    `total_endings` 등은 ai-pipeline `tree_builder`가 자동 계산 후 set.
    `ending_categories`는 ending_classifier 미실행 시 None.
    """

    scenario_id: str
    title: str
    description: str
    phishing_type: str
    difficulty: Literal["easy", "medium", "hard"]
    root_node_id: str
    nodes: dict[str, ScenarioNode]
    protagonist: ProtagonistProfile | None = None
    prologue: str | None = None

    # 파생 필드 (tree_builder 계산)
    total_endings: int = 0
    total_good_endings: int = 0
    total_bad_endings: int = 0

    tags: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    # ending_classifier 결과 (실행 안 했으면 None)
    ending_categories: dict[str, EndingCategory] | None = None

    class Settings:
        name: ClassVar[str] = "scenarios"
        indexes: ClassVar[list] = [
            IndexModel([("scenario_id", ASCENDING)], unique=True),
            IndexModel([("phishing_type", ASCENDING)]),
            IndexModel([("difficulty", ASCENDING)]),
        ]
