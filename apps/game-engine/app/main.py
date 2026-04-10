"""FastAPI 엔트리포인트."""
from contextlib import asynccontextmanager

from fastapi import FastAPI

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


@app.get("/health")
async def health() -> dict[str, str]:
    mongo_ok = await ping()
    return {
        "status": "ok" if mongo_ok else "degraded",
        "mongo": "connected" if mongo_ok else "disconnected",
    }
