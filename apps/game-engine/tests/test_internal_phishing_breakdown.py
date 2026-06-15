"""internal /stats/phishing-breakdown 엔드포인트 — 유저 사기 유형별 강약점 집계.

auth(X-Internal-Api-Key)는 test_internal_auth.py 가 책임 → 여기선 verify_internal_api_key 를
override 하고 집계 계약(그룹/good_count/avg/정렬/빈목록)만 검증한다.
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
from app.models.common import Resources
from app.models.play_log import PlayLog


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


async def _seed_play_log(
    *,
    log_id: str,
    user_id: int,
    phishing_type: str,
    ending_type: str,
    dangerous_count: int,
    total_score: int,
) -> None:
    await PlayLog(
        log_id=log_id,
        scenario_id="sc1",
        user_id=user_id,
        path=[0],
        final_node_id="end",
        ending_type=ending_type,
        final_resource=Resources(trust=1, money=2, awareness=3),
        total_score=total_score,
        dangerous_count=dangerous_count,
        total_choices=3,
        phishing_type=phishing_type,
        duration_seconds=120,
        completed_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
    ).insert()


async def test_groups_by_phishing_type_with_safe_and_danger_aggregates(
    internal_client, test_db
):
    # smishing: 2판(good 1, bad 1), danger [0,4] avg2, score [80,40] avg60
    await _seed_play_log(log_id="l1", user_id=7, phishing_type="smishing",
                         ending_type="ending_good", dangerous_count=0, total_score=80)
    await _seed_play_log(log_id="l2", user_id=7, phishing_type="smishing",
                         ending_type="ending_bad", dangerous_count=4, total_score=40)
    # voice_phishing: 1판(bad), danger 3, score 30
    await _seed_play_log(log_id="l3", user_id=7, phishing_type="voice_phishing",
                         ending_type="ending_bad", dangerous_count=3, total_score=30)
    # 타 유저 기록은 집계에서 제외돼야 함
    await _seed_play_log(log_id="l4", user_id=99, phishing_type="smishing",
                         ending_type="ending_good", dangerous_count=0, total_score=99)

    res = await internal_client.get("/api/internal/stats/phishing-breakdown/7")
    assert res.status_code == 200
    body = res.json()

    # play_count desc → smishing(2) 먼저, voice_phishing(1) 다음
    assert [b["phishing_type"] for b in body] == ["smishing", "voice_phishing"]

    smishing = body[0]
    assert smishing["play_count"] == 2
    assert smishing["good_count"] == 1
    assert smishing["avg_dangerous"] == 2.0
    assert smishing["avg_score"] == 60.0

    voice = body[1]
    assert voice["play_count"] == 1
    assert voice["good_count"] == 0
    assert voice["avg_dangerous"] == 3.0


async def test_empty_returns_200_empty_list(internal_client, test_db):
    res = await internal_client.get("/api/internal/stats/phishing-breakdown/404")
    assert res.status_code == 200
    assert res.json() == []
