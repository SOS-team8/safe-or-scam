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


async def test_parses_unlocked_achievements_from_wrapped_response():
    body = {
        "data": {
            "unlocked_achievements": [
                {
                    "code": "FIRST_CLEAR",
                    "title": "첫 시나리오 플레이 완료",
                    "description": "첫 시나리오를 끝까지 플레이하면 열립니다.",
                    "icon_url": None,
                }
            ]
        }
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=body)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await notify_game_completed(_payload(), client=client)

    assert len(result) == 1
    assert result[0].code == "FIRST_CLEAR"


async def test_skips_invalid_items_but_keeps_valid_ones():
    # 항목 하나가 깨져도 정상 항목은 유실되지 않아야 한다(항목 단위 내결함).
    body = {
        "data": {
            "unlocked_achievements": [
                {"code": "FIRST_CLEAR", "title": "ok", "description": "d", "icon_url": None},
                {"title": "missing-code"},  # code 누락 → 검증 실패
                "not-an-object",  # 형식 오류
            ]
        }
    }

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=body)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await notify_game_completed(_payload(), client=client)

    assert [a.code for a in result] == ["FIRST_CLEAR"]