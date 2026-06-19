"""MongoDB 연결 및 beanie 초기화"""
from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.core.config import settings
from app.models.game_session import GameSession
from app.models.news_article import NewsArticle
from app.models.play_log import PlayLog
from app.models.scenario import Scenario
from app.models.user_scenario_progress import UserScenarioProgress

_client: AsyncMongoClient | None = None


async def init_mongo() -> None:
    """Mongo 클라이언트 생성 + beanie Document 등록.

    FastAPI startup에서 1회 호출. Cloud Run cold start 시 재호출됨.
    """
    global _client
    _client = AsyncMongoClient(settings.mongo_url)
    await init_beanie(
        database=_client[settings.mongo_db],
        document_models=[
            Scenario,
            GameSession,
            PlayLog,
            UserScenarioProgress,
            NewsArticle,
        ],
    )


async def close_mongo() -> None:
    """FastAPI shutdown에서 호출."""
    global _client
    if _client is not None:
        await _client.close()
        _client = None


async def ping() -> bool:
    """health check용. Mongo가 살아있으면 True."""
    if _client is None:
        return False
    try:
        await _client.admin.command("ping")
        return True
    except Exception:
        return False
