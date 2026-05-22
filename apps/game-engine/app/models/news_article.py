"""news_articles 컬렉션 — beanie Document.

ai-pipeline 이 동일 컬렉션에 motor raw upsert로 쓰고, game-engine 이 Beanie로 읽는다.
contract: logs/integration/_workspace/contracts/news-article.md (v1 locked)
upsert key: `url` (unique). race 방지를 위해 양쪽 일관.
"""
from __future__ import annotations

from datetime import datetime

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, DESCENDING, IndexModel


class NewsArticle(Document):
    """피싱 뉴스 기사 (시나리오 생성 시드).

    필드 정의: news-article contract §3 그대로.
    `article_id` 는 ai-pipeline `PhishingArticle.id` 와 동일 값.
    `url` 이 upsert key 이며 unique 인덱스로 race 방지.
    `scenario_generated` / `generated_scenario_ids` 는 재크롤링 시
    `$setOnInsert` 로만 초기화되도록 ai-pipeline upsert 패턴에서 보호.
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
        name = "news_articles"
        indexes = [
            IndexModel([("url", ASCENDING)], unique=True),
            IndexModel([("phishing_type", ASCENDING)]),
            IndexModel([("published_at", DESCENDING)]),
            IndexModel([("scenario_generated", ASCENDING)]),
            IndexModel([("crawled_at", DESCENDING)]),
        ]
