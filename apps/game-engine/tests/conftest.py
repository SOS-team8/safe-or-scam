"""테스트 픽스처 — testcontainers MongoDB + Beanie init.

session 스코프 mongo 컨테이너 1회 기동, function 스코프 DB 격리(drop_database).
"""
from __future__ import annotations

import pytest_asyncio
from beanie import init_beanie
from pymongo import AsyncMongoClient
from testcontainers.mongodb import MongoDbContainer

from app.models.game_session import GameSession
from app.models.news_article import NewsArticle
from app.models.play_log import PlayLog
from app.models.scenario import Scenario
from app.models.user_scenario_progress import UserScenarioProgress


@pytest_asyncio.fixture(scope="session")
async def mongo_container():
    with MongoDbContainer("mongo:7") as mongo:
        yield mongo


@pytest_asyncio.fixture
async def test_db(mongo_container):
    """매 테스트마다 fresh DB. init_beanie 가 인덱스 자동 생성."""
    url = mongo_container.get_connection_url()
    client = AsyncMongoClient(url)
    db = client["test_db"]
    await init_beanie(
        database=db,
        document_models=[
            Scenario,
            GameSession,
            PlayLog,
            UserScenarioProgress,
            NewsArticle,
        ],
    )
    try:
        yield db
    finally:
        await client.drop_database("test_db")
        await client.close()
