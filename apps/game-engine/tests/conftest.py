"""테스트 픽스처 — testcontainers MongoDB + Beanie init.

session 스코프 mongo 컨테이너 1회 기동, function 스코프 DB 격리(drop_database).
"""
from __future__ import annotations

import httpx
import pytest
import pytest_asyncio
from beanie import init_beanie
from fastapi import FastAPI
from pymongo import AsyncMongoClient
from testcontainers.mongodb import MongoDbContainer

from app.api.routes import game_sessions as game_sessions_routes
from app.api.routes import scenarios as scenarios_routes
from app.core.auth import get_current_user
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


@pytest.fixture
def app_for_routes(test_db) -> FastAPI:
    """라우트 테스트용 FastAPI 앱 (DB 초기화 완료된 상태).

    main.py 의 lifespan(init_mongo) 을 거치지 않기 위해 직접 라우터만 등록.
    """
    app = FastAPI()
    app.include_router(scenarios_routes.router, prefix="/api/v1")
    app.include_router(game_sessions_routes.router, prefix="/api/v1")
    return app


@pytest.fixture
def user_payload() -> dict:
    """기본 USER 인증 payload (override 용)."""
    return {"user_id": 42, "role": "USER", "payload": {"sub": "42", "role": "USER"}}


@pytest_asyncio.fixture
async def client(app_for_routes: FastAPI, user_payload: dict):
    """USER 인증된 httpx.AsyncClient (ASGITransport).

    Beanie AsyncMongoClient 가 동일 event loop 에서 동작해야 하므로
    fastapi.testclient.TestClient (sync, 별도 thread loop) 대신 AsyncClient 사용.

    dependency_overrides 로 get_current_user 를 mock — 실제 JWT 검증은 test_auth.py 가 책임.
    """
    app_for_routes.dependency_overrides[get_current_user] = lambda: user_payload
    transport = httpx.ASGITransport(app=app_for_routes)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app_for_routes.dependency_overrides.clear()


@pytest_asyncio.fixture
async def unauth_client(app_for_routes: FastAPI):
    """인증 미적용 AsyncClient — HTTPBearer auto_error 동작 확인용."""
    transport = httpx.ASGITransport(app=app_for_routes)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
