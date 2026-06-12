"""backend_client 발신 테스트 — httpx.MockTransport 주입(전역 patch 회피).

notify_game_completed 는 주입된 client 로만 동작하므로 Mongo 컨테이너/앱 기동 불필요.
"""
from __future__ import annotations

import json

import httpx

from app.core.backend_client import GameCompletedPayload, notify_game_completed
from app.core.config import settings


def _payload() -> GameCompletedPayload:
    return GameCompletedPayload(
        play_log_id="log-abc",
        user_id=1,
        scenario_id="scenario_001",
        session_id="sess-1",
        ending_type="ending_good",
        final_node_id="n_end_good",
        completion_rate=1.0,
        total_score=120,
        dangerous_count=2,
        duration_seconds=87,
        completed_at="2026-06-05T05:40:58.123456+00:00",
    )


async def test_maps_request_to_internal_endpoint():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["api_key"] = request.headers.get("X-Internal-Api-Key")
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={"unlocked_achievements": []})

    payload = _payload()
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        await notify_game_completed(payload, client=client)

    assert captured["url"].endswith("/api/internal/stats/game-completed")
    assert captured["api_key"] == settings.internal_api_key
    assert captured["body"] == payload.model_dump()


async def test_absorbs_non_2xx():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"message": "boom"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        # best-effort: 예외 전파 없이 정상 반환해야 함
        await notify_game_completed(_payload(), client=client)


async def test_absorbs_connection_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        await notify_game_completed(_payload(), client=client)