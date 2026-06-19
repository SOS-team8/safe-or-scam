"""NewsArticle Beanie Document 미러 (game-engine과 동일 스키마).

contract `news-article.md` v1 그대로. game-engine의 Beanie Document를 직접 import하지
않고 동일 스키마를 여기에 정의 (서비스 결합 회피). 필드명·타입·default·인덱스 모두 동일.

writer: ai-pipeline (crawler.py upsert, tree_builder.py 갱신).
reader: ai-pipeline, game-engine.
"""
from datetime import datetime
from typing import ClassVar

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, DESCENDING, IndexModel


class NewsArticle(Document):
    """피싱 뉴스 기사 (collection: news_articles).

    upsert key: `url` (unique 인덱스).
    재크롤링 시 `scenario_generated` / `generated_scenario_ids`는 `$setOnInsert`로만 보호.
    """

    article_id: str
    url: str
    title: str
    source: str
    published_at: datetime | None = None
    body: str | None = None
    phishing_type: str
    victim_profile: str | None = None
    scammer_persona: str | None = None
    initial_contact: str | None = None
    persuasion_tactics: list[str] = Field(default_factory=list)
    requested_actions: list[str] = Field(default_factory=list)
    red_flags: list[str] = Field(default_factory=list)
    damage_amount: str | None = None
    scenario_seed: str | None = None
    crawled_at: datetime
    scenario_generated: bool = False
    generated_scenario_ids: list[str] = Field(default_factory=list)

    class Settings:
        name: ClassVar[str] = "news_articles"
        indexes: ClassVar[list] = [
            IndexModel([("url", ASCENDING)], unique=True),
            IndexModel([("phishing_type", ASCENDING)]),
            IndexModel([("published_at", DESCENDING)]),
            IndexModel([("scenario_generated", ASCENDING)]),
            IndexModel([("crawled_at", DESCENDING)]),
        ]
