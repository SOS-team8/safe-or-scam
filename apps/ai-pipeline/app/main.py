"""FastAPI 엔트리포인트 (ai-pipeline)."""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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


_SEED_SCENARIOS_DIR = Path(__file__).resolve().parent / "data" / "scenarios"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan — MongoDB init/close + 디스크 시드 자동 적재 (#51).

    개발 환경에서 MongoDB가 미가용일 경우 import-only 부팅이 가능하도록 try/except.
    프로덕션에서는 init 실패가 명시 raise로 노출되어 fast-fail 권장 — `is_production` 분기.

    Mongo init 직후 `app/data/scenarios/*.json` 을 스캔해 scenario_id 가
    mongo 에 없는 항목만 upsert. fresh DB / docker volume 재생성 시 같이 따라온
    예시 시나리오가 자동으로 채워진다. 이미 있는 시나리오는 건드리지 않음.
    """
    mongo_ready = False
    try:
        await mongo_mod.init_mongo()
        mongo_ready = True
    except Exception as exc:  # noqa: BLE001
        if settings.is_production:
            raise
        _logger.warning(
            "MongoDB init 실패 (개발 환경 — import-only 부팅 계속): %s", exc
        )

    if mongo_ready:
        try:
            await mongo_mod.seed_scenarios_from_disk(_SEED_SCENARIOS_DIR)
        except Exception as exc:  # noqa: BLE001
            _logger.warning("seed_scenarios_from_disk 실패 (무시): %s", exc)

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


# 시나리오 노드 이미지 정적 서빙.
# MongoDB scenarios.nodes[*].image_url 은 "/api/v1/images/scenario_xxx/node_xxx.png"
# 형태로 저장되며, 실제 파일은 images_dir 하위에 저장된다.
# 설정 없거나 디렉토리 미존재 시에는 mount 생략 (개발/CI 환경 안전 분기).
def _mount_images(app: FastAPI) -> bool:
    images_dir = Path(settings.images_dir)
    # 디렉토리가 없으면 만들어서라도 mount — image_generator 가 시나리오 생성 시
    # 디렉토리를 사용하므로 startup 시점에 보장해두면 mount/저장 위치 미스매치
    # 회귀가 원천 차단된다 (#51).
    try:
        images_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        _logger.warning(
            "images_dir(%s) 생성 실패 — /api/v1/images 정적 서빙 비활성화: %s",
            images_dir, exc,
        )
        return False
    app.mount(
        "/api/v1/images",
        StaticFiles(directory=str(images_dir)),
        name="images",
    )
    _logger.info("images_dir(%s) 마운트 완료: /api/v1/images", images_dir)
    return True


_mount_images(app)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
