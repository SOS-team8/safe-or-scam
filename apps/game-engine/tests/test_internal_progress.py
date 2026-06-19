"""internal /progress 엔드포인트 — 유저 시나리오별 결말 유형 수집 진행도.

auth(X-Internal-Api-Key)는 test_internal_auth.py 가 책임 → 여기선 verify_internal_api_key 를
override 하고 응답 계약(유형 기준 필드·정렬·빈목록)만 검증한다.
internal 라우터는 conftest 의 app_for_routes 에 없어 전용 app·client fixture 를 둔다.
"""
from __future__ import annotations

from datetime import datetime, timezone

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI

from app.api.routes import internal as internal_routes
from app.core.internal_auth import verify_internal_api_key
from app.models.user_scenario_progress import UserScenarioProgress


@pytest.fixture
def internal_app(test_db) -> FastAPI:
    app = FastAPI()
    app.include_router(internal_routes.router, prefix="/api/internal")
    app.dependency_overrides[verify_internal_api_key] = lambda: None
    return app


@pytest_asyncio.fixture
async def internal_client(internal_app: FastAPI):
    transport = httpx.ASGITransport(app=internal_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    internal_app.dependency_overrides.clear()


async def _seed_progress(
    *,
    user_id: int,
    scenario_id: str,
    discovered_categories: list[str],
    total_categories: int,
    completion_rate: float,
    last_played_at: datetime,
) -> None:
    await UserScenarioProgress(
        user_id=user_id,
        scenario_id=scenario_id,
        discovered_categories=discovered_categories,
        total_categories=total_categories,
        completion_rate=completion_rate,
        play_count=1,
        last_played_at=last_played_at,
    ).insert()


async def test_progress_serializes_category_fields(internal_client, test_db):
    """응답이 유형 기준 필드(discovered_category_count/total_categories)로 직렬화."""
    await _seed_progress(
        user_id=7,
        scenario_id="sc1",
        discovered_categories=["c1", "c2"],
        total_categories=10,
        completion_rate=0.2,
        last_played_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )

    res = await internal_client.get("/api/internal/progress/7")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    item = body[0]
    assert item["scenario_id"] == "sc1"
    assert item["completion_rate"] == 0.2
    assert item["discovered_category_count"] == 2  # len(discovered_categories)
    assert item["total_categories"] == 10
    # 구 키는 제거됨
    assert "discovered_count" not in item
    assert "total_endings" not in item


async def test_progress_empty_returns_200_empty_list(internal_client, test_db):
    res = await internal_client.get("/api/internal/progress/999")
    assert res.status_code == 200
    assert res.json() == []


async def test_progress_sorted_by_last_played_desc(internal_client, test_db):
    older = datetime(2026, 5, 1, tzinfo=timezone.utc)
    newer = datetime(2026, 6, 1, tzinfo=timezone.utc)
    await _seed_progress(
        user_id=7,
        scenario_id="old",
        discovered_categories=["c1"],
        total_categories=10,
        completion_rate=0.1,
        last_played_at=older,
    )
    await _seed_progress(
        user_id=7,
        scenario_id="new",
        discovered_categories=["c1", "c2"],
        total_categories=10,
        completion_rate=0.2,
        last_played_at=newer,
    )

    res = await internal_client.get("/api/internal/progress/7")
    assert res.status_code == 200
    assert [i["scenario_id"] for i in res.json()] == ["new", "old"]
