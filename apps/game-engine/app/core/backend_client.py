"""game-engine >> backend 발신 클라이언트 — 결말 도달 시 통계 동기화 POST.

best-effort fire-and-forget: 실패해도 게임 완료는 항상 성공해야 하므로 모든 예외를
흡수하고 warning 로그만 남긴다. 멱등키(play_log_id)로 backend 가 중복을 차단하므로
재발신은 안전. backend 수신부: POST /api/internal/stats/game-completed.
"""
from __future__ import annotations

import logging

import httpx
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

_ENDPOINT = "/api/internal/stats/game-completed"
_TIMEOUT = httpx.Timeout(connect=2.0, read=3.0, write=3.0, pool=3.0)


class GameCompletedPayload(BaseModel):
    """backend GameCompletedRequest 계약과 1:1 (snake_case 키 동일).

    game-engine 은 결말 도달 시 항상 구체 값을 채워 보내므로 모두 non-optional.
    completed_at 은 UTC tz-aware ISO-8601 문자열(now.isoformat()).
    """

    play_log_id: str
    user_id: int
    scenario_id: str
    session_id: str
    ending_type: str
    final_node_id: str
    completion_rate: float
    total_score: int
    dangerous_count: int
    duration_seconds: int
    completed_at: str


async def notify_game_completed(
    payload: GameCompletedPayload,
    *,
    client: httpx.AsyncClient | None = None,
) -> None:
    """결말 동기화를 backend 로 발신(best-effort). 실패는 흡수 + warning 로그.

    client 인자는 테스트에서 MockTransport 주입용(미주입 시 per-call 클라이언트 생성).
    """
    url = f"{settings.backend_base_url.rstrip('/')}{_ENDPOINT}"
    headers = {"X-Internal-Api-Key": settings.internal_api_key}
    body = payload.model_dump()

    owns_client = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=_TIMEOUT)
    try:
        resp = await client.post(url, json=body, headers=headers)
        resp.raise_for_status()
    except Exception as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        logger.warning(
            "game-completed sync failed (status=%s play_log_id=%s user_id=%s)",
            status,
            payload.play_log_id,
            payload.user_id,
            exc_info=True,
        )
    finally:
        if owns_client:
            await client.aclose()