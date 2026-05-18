"""MongoDB 연결 + Beanie init + upsert 헬퍼.

contract `news-article.md` v1 §4 / `scenario-tree.md` v2 §1 준수.

- writer: ai-pipeline. upsert filter = `{"url": ...}` (news) / `{"scenario_id": ...}` (scenarios).
- `$set` / `$setOnInsert` 분리로 재크롤링 시 시나리오 생성 추적 필드 보호.
- game-engine의 Beanie Document를 직접 import하지 않음 (서비스 결합 회피); 동일 스키마 미러 사용.
- pymongo `AsyncMongoClient` (motor를 대체한 pymongo 내장 async client) 사용 — Beanie 2.x와
  호환. game-engine의 `app/db/mongo.py`와 동일 패턴.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from beanie import init_beanie
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.config import settings
from app.models.news_article_db import NewsArticle
from app.models.scenario_db import Scenario

if TYPE_CHECKING:
    from app.models.news import PhishingArticle
    from app.models.scenario import ScenarioTree

logger = logging.getLogger("db.mongo")

_client: AsyncMongoClient | None = None
_db: AsyncDatabase | None = None


async def init_mongo() -> None:
    """FastAPI startup에서 1회 호출. Beanie Document 등록 + 인덱스 생성.

    Cloud Run cold start 시 재호출됨. 실패 시 RuntimeError. 호출 측이 try/except 책임.
    """
    global _client, _db
    _client = AsyncMongoClient(settings.mongodb_url)
    _db = _client[settings.mongodb_db]
    await init_beanie(
        database=_db,
        document_models=[NewsArticle, Scenario],
    )
    logger.info("MongoDB initialized: %s / %s", settings.mongodb_url, settings.mongodb_db)


async def close_mongo() -> None:
    """FastAPI shutdown에서 호출."""
    global _client, _db
    if _client is not None:
        await _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed")


def get_db():
    """raw mongo DB. init_mongo() 이후에만 호출 가능.

    Returns: pymongo `AsyncDatabase` 또는 (테스트용) mongomock-motor MockDatabase.
    """
    if _db is None:
        raise RuntimeError("MongoDB not initialized. Call init_mongo() first.")
    return _db


def set_db_for_testing(db) -> None:
    """테스트용 의존성 주입 (mongomock-motor 등).

    실제 코드에서는 호출하지 않는다. 호출 후 close_mongo()는 무시될 수 있음.
    """
    global _db
    _db = db


# -----------------------------------------------------------------------------
# Upsert helpers (news-article §4 + scenario-tree §1)
# -----------------------------------------------------------------------------


def _phishing_article_to_doc(article: "PhishingArticle") -> dict[str, Any]:
    """PhishingArticle → MongoDB document. crawled_at은 호출 측이 세팅."""
    doc = article.model_dump(mode="json")
    # article_id는 PhishingArticle.id와 동일
    doc["article_id"] = article.id
    doc.pop("id", None)
    # scenario_generated / generated_scenario_ids 는 $setOnInsert로만 처리 (재크롤링 보호)
    doc.pop("scenario_generated", None)
    doc.pop("generated_scenario_ids", None)
    return doc


async def upsert_phishing_article(article: "PhishingArticle") -> dict[str, Any]:
    """크롤링 결과를 news_articles 컬렉션에 upsert.

    Returns: motor UpdateResult.raw_result (또는 dict). 호출 측이 로깅에 사용.

    upsert key: `url` (unique).
    `$set`: 모든 식별·요약 필드 + crawled_at = now.
    `$setOnInsert`: scenario_generated=False, generated_scenario_ids=[].
    """
    db = get_db()
    doc = _phishing_article_to_doc(article)
    doc["crawled_at"] = datetime.now(timezone.utc)
    result = await db.news_articles.update_one(
        {"url": article.url},
        {
            "$set": doc,
            "$setOnInsert": {
                "scenario_generated": False,
                "generated_scenario_ids": [],
            },
        },
        upsert=True,
    )
    return {
        "matched": result.matched_count,
        "modified": result.modified_count,
        "upserted_id": str(result.upserted_id) if result.upserted_id else None,
    }


async def upsert_scenario(tree: "ScenarioTree") -> dict[str, Any]:
    """시나리오 트리를 scenarios 컬렉션에 upsert.

    upsert key: `scenario_id` (unique).
    `$set`: 모든 필드 + updated_at = now.
    `$setOnInsert`: created_at = tree.created_at (신규 시에만; 기존 created_at 보존).
    """
    db = get_db()
    # serialization_alias 적용 — `scenario_id`로 출력
    doc = tree.model_dump(mode="json", by_alias=True)
    now = datetime.now(timezone.utc)
    doc["updated_at"] = now.isoformat()
    # created_at은 신규 시에만; $set에서는 제거
    doc.pop("created_at", None)
    created_at_val = (
        tree.created_at.isoformat()
        if isinstance(tree.created_at, datetime)
        else str(tree.created_at)
    )
    result = await db.scenarios.update_one(
        {"scenario_id": tree.scenario_id},
        {
            "$set": doc,
            "$setOnInsert": {"created_at": created_at_val},
        },
        upsert=True,
    )
    return {
        "matched": result.matched_count,
        "modified": result.modified_count,
        "upserted_id": str(result.upserted_id) if result.upserted_id else None,
    }


async def mark_article_scenario_generated(
    article_id: str, scenario_id: str
) -> dict[str, Any]:
    """시나리오 생성 후 news_articles에 추적 정보 갱신.

    contract news-article §4 후반 — `$set` + `$addToSet`.
    """
    db = get_db()
    result = await db.news_articles.update_one(
        {"article_id": article_id},
        {
            "$set": {"scenario_generated": True},
            "$addToSet": {"generated_scenario_ids": scenario_id},
        },
    )
    return {
        "matched": result.matched_count,
        "modified": result.modified_count,
    }
