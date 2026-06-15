"""game-engine >> backend 발신 클라이언트 — 결말 도달 시 통계 동기화 POST.

best-effort: 실패해도 게임 완료는 항상 성공해야 하므로 모든 예외를 흡수하고 warning
로그만 남긴 뒤 빈 목록을 반환한다. 멱등키(play_log_id)로 backend 가 중복을 차단하므로
재발신은 안전. backend 수신부: POST /api/internal/stats/game-completed.

결말 도달 시 새로 달성한 업적 목록을 응답(ApiResponse<GameCompletedResponse>)에서
파싱해 호출자(move 핸들러)가 MoveResponse 로 클라이언트에 전달한다. 호출자는 이 결과를
await 하므로 backend 가 느리면 결말 응답이 지연될 수 있으나, 타임아웃(2s/3s) + 예외 흡수로
게임 완료 자체는 항상 성공한다.
"""
from __future__ import annotations

import logging

import httpx
from pydantic import BaseModel

from app.core.config import settings
from app.schemas.game import UnlockedAchievementView

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
) -> list[UnlockedAchievementView]:
    """결말 동기화를 backend 로 발신(best-effort). 실패는 흡수 + warning 로그 후 [] 반환.

    성공 시 backend 응답(ApiResponse<GameCompletedResponse>)의
    data.unlocked_achievements 를 파싱해 새로 달성한 업적 목록을 반환한다.

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
        parsed = resp.json() or {}
        # 실제 backend 는 ApiResponse 래퍼({data:{...}}). data 가 dict 면 그 안에서,
        # 아니면 최상위에서 unlocked_achievements 를 찾는다(언래핑 응답에도 견고).
        container = parsed.get("data") if isinstance(parsed.get("data"), dict) else parsed
        raw = container.get("unlocked_achievements") or []
        # 항목 단위 내결함: 한 항목의 검증 실패가 정상 항목까지 유실시키지 않도록
        # 개별 항목은 skip 하고 나머지는 누적한다.
        unlocked: list[UnlockedAchievementView] = []
        for item in raw:
            try:
                unlocked.append(UnlockedAchievementView.model_validate(item))
            except Exception:
                logger.warning(
                    "skipping invalid unlocked achievement item (play_log_id=%s): %r",
                    payload.play_log_id,
                    item,
                    exc_info=True,
                )
        return unlocked
    except Exception as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        logger.warning(
            "game-completed sync failed (status=%s play_log_id=%s user_id=%s)",
            status,
            payload.play_log_id,
            payload.user_id,
            exc_info=True,
        )
        return []
    finally:
        if owns_client:
            await client.aclose()