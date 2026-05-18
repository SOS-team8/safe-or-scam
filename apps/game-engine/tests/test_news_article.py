"""NewsArticle Beanie Document 단위 테스트.

news-article contract v1 §3 의 5-index 정의 및 필드/기본값 검증.
"""
from __future__ import annotations

from datetime import UTC, datetime

import pytest
from pymongo.errors import DuplicateKeyError

from app.models.news_article import NewsArticle


async def test_news_article_insert_and_find(test_db):
    a = NewsArticle(
        article_id="a1",
        url="https://example.com/a1",
        title="피싱 사례",
        source="연합뉴스",
        phishing_type="smishing",
        crawled_at=datetime.now(UTC),
    )
    await a.insert()
    fetched = await NewsArticle.find_one(NewsArticle.url == "https://example.com/a1")
    assert fetched is not None
    assert fetched.article_id == "a1"
    assert fetched.title == "피싱 사례"
    assert fetched.source == "연합뉴스"
    assert fetched.phishing_type == "smishing"
    assert fetched.scenario_generated is False
    assert fetched.generated_scenario_ids == []


async def test_news_article_url_unique(test_db):
    base = dict(
        url="https://example.com/dup",
        title="중복 테스트",
        source="s",
        phishing_type="smishing",
        crawled_at=datetime.now(UTC),
    )
    await NewsArticle(article_id="a2", **base).insert()
    with pytest.raises(DuplicateKeyError):
        await NewsArticle(article_id="a3", **base).insert()


async def test_news_article_defaults_for_optional_fields(test_db):
    """필수 외 필드는 None 또는 빈 리스트 default."""
    a = NewsArticle(
        article_id="a4",
        url="https://example.com/d4",
        title="기본값 검증",
        source="s",
        phishing_type="voice_phishing",
        crawled_at=datetime.now(UTC),
    )
    await a.insert()
    fetched = await NewsArticle.find_one(NewsArticle.url == "https://example.com/d4")
    assert fetched is not None
    assert fetched.published_at is None
    assert fetched.body is None
    assert fetched.victim_profile is None
    assert fetched.scammer_persona is None
    assert fetched.initial_contact is None
    assert fetched.persuasion_tactics == []
    assert fetched.requested_actions == []
    assert fetched.red_flags == []
    assert fetched.damage_amount is None
    assert fetched.scenario_seed is None


async def test_news_article_full_fields_roundtrip(test_db):
    now = datetime.now(UTC)
    a = NewsArticle(
        article_id="a5",
        url="https://example.com/full",
        title="전체 필드",
        source="BBC News",
        published_at=now,
        body="본문 …",
        phishing_type="smishing",
        victim_profile="40대 자영업자",
        scammer_persona="택배 기사",
        initial_contact="문자 메시지",
        persuasion_tactics=["긴급성 강조", "공식 기관 사칭"],
        requested_actions=["URL 클릭", "앱 설치"],
        red_flags=["단축 URL", "어색한 맞춤법"],
        damage_amount="약 500만원",
        scenario_seed="택배 사칭 스미싱 시나리오",
        crawled_at=now,
        scenario_generated=True,
        generated_scenario_ids=["sc_1", "sc_2"],
    )
    await a.insert()
    fetched = await NewsArticle.find_one(NewsArticle.url == "https://example.com/full")
    assert fetched is not None
    assert fetched.persuasion_tactics == ["긴급성 강조", "공식 기관 사칭"]
    assert fetched.scenario_generated is True
    assert fetched.generated_scenario_ids == ["sc_1", "sc_2"]
