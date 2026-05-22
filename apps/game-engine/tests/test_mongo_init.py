"""init_beanie 후 news_articles 컬렉션의 인덱스 자동 생성 검증.

news-article contract §3 의 5-index 정의가 init_beanie 호출로 실제 컬렉션에 적용되는지 확인.
"""
from __future__ import annotations


async def test_news_articles_indexes_created(test_db):
    """5 contract indexes + _id 가 자동 생성되어야 함."""
    coll = test_db["news_articles"]
    info = await coll.index_information()
    # 모든 인덱스 (key, direction) 첫 필드 추출 → set 으로 검증
    first_keys: set[tuple[str, int]] = set()
    for v in info.values():
        if v["key"]:
            field, direction = v["key"][0]
            first_keys.add((field, direction))

    # 1) url unique
    assert "url_1" in info
    assert info["url_1"].get("unique") is True
    assert ("url", 1) in first_keys

    # 2~5) 나머지 인덱스
    assert ("phishing_type", 1) in first_keys
    assert ("published_at", -1) in first_keys
    assert ("scenario_generated", 1) in first_keys
    assert ("crawled_at", -1) in first_keys


async def test_app_db_mongo_registers_news_article():
    """app.db.mongo 모듈의 document_models 에 NewsArticle 이 포함돼 있어야 함.

    런타임 init_mongo 자체는 외부 Mongo 가 필요하므로 모듈 수준 import 만 검사한다.
    """
    from app.db import mongo as mongo_module
    from app.models.news_article import NewsArticle

    # init_mongo 함수 본문에서 NewsArticle 을 참조하는지 정적으로 검증
    import inspect

    src = inspect.getsource(mongo_module.init_mongo)
    assert "NewsArticle" in src, (
        "app/db/mongo.py::init_mongo must register NewsArticle in document_models"
    )
    # NewsArticle 클래스가 임포트 가능해야 함
    assert NewsArticle.__name__ == "NewsArticle"
