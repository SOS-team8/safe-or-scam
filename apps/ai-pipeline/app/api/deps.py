"""공통 API 의존성"""
import hmac
import logging
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import Cookie, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

logger = logging.getLogger("api.deps")

# Rate Limiter (circular import 방지를 위해 여기서 정의)
limiter = Limiter(key_func=get_remote_address)

# 백그라운드 작업 동시 실행 제한
_active_tasks: dict[str, datetime] = {}
_tasks_lock = threading.Lock()
_TASK_EXPIRY_HOURS = 1


def acquire_task_slot(task_id: str) -> bool:
    """백그라운드 작업 슬롯 획득. 초과 시 False 반환."""
    with _tasks_lock:
        _cleanup_stale_tasks()
        if len(_active_tasks) >= settings.max_concurrent_tasks:
            return False
        _active_tasks[task_id] = datetime.now(timezone.utc)
        return True


def release_task_slot(task_id: str):
    """백그라운드 작업 슬롯 반환."""
    with _tasks_lock:
        _active_tasks.pop(task_id, None)


def _cleanup_stale_tasks():
    """1시간 이상 경과한 작업 슬롯 자동 정리 (lock 내부에서 호출)."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=_TASK_EXPIRY_HOURS)
    stale = [tid for tid, started in _active_tasks.items() if started < cutoff]
    for tid in stale:
        logger.warning("작업 슬롯 만료 정리: %s", tid)
        del _active_tasks[tid]


_MAX_TASK_HISTORY = 50


def cleanup_task_dict(tasks: dict[str, dict]):
    """오래된 완료/실패 작업을 정리하여 메모리 누수 방지.

    최대 _MAX_TASK_HISTORY개까지만 유지.
    """
    if len(tasks) <= _MAX_TASK_HISTORY:
        return
    # 완료/실패된 항목부터 삭제
    removable = [
        tid for tid, t in tasks.items()
        if t.get("status") in ("completed", "failed")
    ]
    to_remove = len(tasks) - _MAX_TASK_HISTORY
    for tid in removable[:to_remove]:
        del tasks[tid]


def sanitize_error(e: Exception) -> str:
    """내부 정보 노출 방지를 위해 에러 메시지 정리."""
    msg = str(e)
    if len(msg) > 200:
        msg = msg[:200] + "..."
    return msg


def require_admin(admin_token: Optional[str] = Cookie(None)):
    """관리자 인증 의존성 (P0-008: hmac.compare_digest로 timing attack 차단).

    TODO: backend-spring과 통합 시 JWT 토큰 검증으로 교체.
    현재는 ADMIN_PASSWORD 환경변수와 일치하는 토큰만 허용.

    `==` 평문 비교는 길이별 timing 차이로 토큰 길이가 노출될 수 있음. `hmac.compare_digest`는
    constant-time 비교 (길이 다르면 즉시 False, 같으면 모든 바이트를 비교).
    """
    if not admin_token:
        raise HTTPException(status_code=403, detail="관리자 인증이 필요합니다")

    expected = settings.admin_password
    if not expected:
        raise HTTPException(status_code=403, detail="유효하지 않은 토큰입니다")

    # encode to bytes to ensure consistent length comparison
    if not hmac.compare_digest(admin_token.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(status_code=403, detail="유효하지 않은 토큰입니다")
