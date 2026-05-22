"""app/db/mongo.py 초기화 함수 존재 검증.

실제 MongoDB 연결은 통합 검증 단계에서 수동 수행. 본 테스트는 import + signature만 검증.
"""
import inspect


def test_mongo_module_exposes_init_and_close():
    from app.db import mongo

    assert hasattr(mongo, "init_mongo")
    assert inspect.iscoroutinefunction(mongo.init_mongo)
    assert hasattr(mongo, "close_mongo")
    assert inspect.iscoroutinefunction(mongo.close_mongo)


def test_mongo_module_exposes_upsert_helpers():
    """contract news-article §4 / scenario-tree §1 upsert 헬퍼들이 비동기 함수로 노출."""
    from app.db import mongo

    assert hasattr(mongo, "upsert_phishing_article")
    assert inspect.iscoroutinefunction(mongo.upsert_phishing_article)
    assert hasattr(mongo, "upsert_scenario")
    assert inspect.iscoroutinefunction(mongo.upsert_scenario)
    assert hasattr(mongo, "mark_article_scenario_generated")
    assert inspect.iscoroutinefunction(mongo.mark_article_scenario_generated)
