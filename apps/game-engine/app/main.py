"""FastAPI 엔트리포인트."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import game_sessions, scenarios, internal
from app.core.config import settings
from app.db.mongo import close_mongo, init_mongo, ping


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_mongo()
    yield
    await close_mongo()


app = FastAPI(
    title="Safe-or-Scam Game Engine",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 허용 origin 은 환경변수로 주입(CORS_ALLOWED_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins_list,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scenarios.router, prefix="/api/v1")
app.include_router(game_sessions.router, prefix="/api/v1")

# 서비스 간 internal API — /internal/* , API Key 인증, 스키마/문서 비노출.
app.include_router(internal.router, prefix="/api/internal", include_in_schema=False)


@app.get("/health")
async def health() -> dict[str, str]:
    mongo_ok = await ping()
    return {
        "status": "ok" if mongo_ok else "degraded",
        "mongo": "connected" if mongo_ok else "disconnected",
    }
