"""FastAPI 엔트리포인트 (ai-pipeline)."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.api.deps import limiter
from app.api.routes import scenario, crawler
from app.db import mongo as mongo_mod


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logging.getLogger("pipeline").setLevel(logging.DEBUG)
_logger = logging.getLogger("app.main")


_docs_kwargs = {}
if settings.is_production:
    _docs_kwargs = {"docs_url": None, "redoc_url": None, "openapi_url": None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan — MongoDB init/close.

    개발 환경에서 MongoDB가 미가용일 경우 import-only 부팅이 가능하도록 try/except.
    프로덕션에서는 init 실패가 명시 raise로 노출되어 fast-fail 권장 — `is_production` 분기.
    """
    try:
        await mongo_mod.init_mongo()
    except Exception as exc:  # noqa: BLE001
        if settings.is_production:
            raise
        _logger.warning(
            "MongoDB init 실패 (개발 환경 — import-only 부팅 계속): %s", exc
        )
    try:
        yield
    finally:
        try:
            await mongo_mod.close_mongo()
        except Exception as exc:  # noqa: BLE001
            _logger.warning("MongoDB close 실패 (무시): %s", exc)


app = FastAPI(
    title="Safe-or-Scam AI Pipeline",
    description="자동 시나리오 생성 파이프라인",
    version="0.1.0",
    lifespan=lifespan,
    **_docs_kwargs,
)


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


app.include_router(scenario.router, prefix="/api/v1")
app.include_router(crawler.router, prefix="/api/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
