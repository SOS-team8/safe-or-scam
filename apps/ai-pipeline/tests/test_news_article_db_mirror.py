"""ai-pipeline NewsArticle Beanie Document 미러 검증.

contract `news-article.md` v1 §2/§3과 정확히 일치해야 한다.
game-engine 측 Document와 필드명·타입·default·인덱스가 모두 동일해야 cross-boundary upsert/fetch 안전.
"""
from datetime import datetime, timezone

from app.models.news_article_db import NewsArticle


def test_news_article_settings_name():
    assert NewsArticle.Settings.name == "news_articles"


def test_news_article_fields_match_contract():
    """contract §2 필드 18건 (article_id ~ generated_scenario_ids)."""
    fields = NewsArticle.model_fields
    expected = {
        "article_id",
        "url",
        "title",
        "source",
        "published_at",
        "body",
        "phishing_type",
        "victim_profile",
        "scammer_persona",
        "initial_contact",
        "persuasion_tactics",
        "requested_actions",
        "red_flags",
        "damage_amount",
        "scenario_seed",
        "crawled_at",
        "scenario_generated",
        "generated_scenario_ids",
    }
    # Beanie Document는 id (mongo _id), revision_id 같은 메타 필드를 가짐 — expected만 부분 검사.
    assert expected.issubset(set(fields.keys())), (
        f"missing fields: {expected - set(fields.keys())}"
    )


def test_news_article_defaults():
    """scenario_generated/generated_scenario_ids는 신규 시 기본값.

    Beanie Document는 init_beanie 없이 생성자 호출 불가 → model_fields 검사로 대체.
    """
    fields = NewsArticle.model_fields
    assert fields["scenario_generated"].default is False
    assert fields["generated_scenario_ids"].default_factory() == []
    assert fields["published_at"].default is None
    assert fields["body"].default is None
    assert fields["persuasion_tactics"].default_factory() == []


def test_news_article_indexes_match_contract():
    """contract §3 5개 인덱스 — url unique 등."""
    indexes = NewsArticle.Settings.indexes
    assert len(indexes) == 5
    # 첫 인덱스가 url unique인지
    url_idx = indexes[0]
    # IndexModel.document에 unique=True 포함 확인
    doc = url_idx.document
    assert "unique" in doc and doc["unique"] is True
    # key는 [('url', 1)]
    assert list(doc["key"].items())[0] == ("url", 1)
