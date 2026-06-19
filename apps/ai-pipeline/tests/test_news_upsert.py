"""크롤링 결과 → news_articles 컬렉션 upsert 검증.

contract `news-article.md` §4 — $set + $setOnInsert 분리, url unique key.
mongomock-motor로 in-memory MongoDB 검증.
"""
from datetime import datetime, timezone

import pytest
from mongomock_motor import AsyncMongoMockClient

from app.db import mongo as mongo_mod
from app.models.news import PhishingArticle


@pytest.fixture
def mongo_db():
    """mongomock-motor in-memory DB 주입."""
    client = AsyncMongoMockClient()
    db = client["test_db"]
    mongo_mod.set_db_for_testing(db)
    yield db
    mongo_mod.set_db_for_testing(None)


@pytest.mark.asyncio
async def test_upsert_article_new_inserts_with_setOnInsert(mongo_db, sample_phishing_article):
    """신규 article: $setOnInsert로 scenario_generated=False, generated_scenario_ids=[]."""
    result = await mongo_mod.upsert_phishing_article(sample_phishing_article)
    assert result["upserted_id"] is not None
    assert result["matched"] == 0

    docs = await mongo_db.news_articles.find().to_list(length=10)
    assert len(docs) == 1
    doc = docs[0]
    assert doc["url"] == sample_phishing_article.url
    assert doc["scenario_generated"] is False
    assert doc["generated_scenario_ids"] == []
    assert doc["article_id"] == sample_phishing_article.id
    # crawled_at은 datetime
    assert "crawled_at" in doc


@pytest.mark.asyncio
async def test_upsert_article_repeat_preserves_scenario_generated(mongo_db, sample_phishing_article):
    """재크롤링 시 scenario_generated와 generated_scenario_ids는 보존되어야 함 (contract §4)."""
    # 1. 신규 upsert
    await mongo_mod.upsert_phishing_article(sample_phishing_article)
    # 2. 시나리오 생성 후 추적 정보 갱신 (mark_article_scenario_generated)
    await mongo_mod.mark_article_scenario_generated(
        sample_phishing_article.id, "scenario_xyz"
    )
    # 3. 재크롤링 (제목 변경)
    sample_phishing_article.title = "변경된 제목"
    await mongo_mod.upsert_phishing_article(sample_phishing_article)

    # 검증: title은 갱신, scenario_generated/generated_scenario_ids는 보존
    doc = await mongo_db.news_articles.find_one({"url": sample_phishing_article.url})
    assert doc["title"] == "변경된 제목"
    assert doc["scenario_generated"] is True
    assert doc["generated_scenario_ids"] == ["scenario_xyz"]


@pytest.mark.asyncio
async def test_upsert_article_url_unique(mongo_db, sample_phishing_article):
    """동일 url은 한 document만 (upsert key=url)."""
    await mongo_mod.upsert_phishing_article(sample_phishing_article)
    sample_phishing_article.title = "다른 제목"
    await mongo_mod.upsert_phishing_article(sample_phishing_article)

    count = await mongo_db.news_articles.count_documents({"url": sample_phishing_article.url})
    assert count == 1


@pytest.mark.asyncio
async def test_mark_article_scenario_generated_addtoset(mongo_db, sample_phishing_article):
    """addToSet은 중복 추가 차단 (멱등)."""
    await mongo_mod.upsert_phishing_article(sample_phishing_article)
    await mongo_mod.mark_article_scenario_generated(sample_phishing_article.id, "s1")
    await mongo_mod.mark_article_scenario_generated(sample_phishing_article.id, "s1")
    await mongo_mod.mark_article_scenario_generated(sample_phishing_article.id, "s2")
    doc = await mongo_db.news_articles.find_one({"article_id": sample_phishing_article.id})
    assert doc["scenario_generated"] is True
    assert sorted(doc["generated_scenario_ids"]) == ["s1", "s2"]
