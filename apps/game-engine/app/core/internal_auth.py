"""Internal API Key 인증 dependency (서비스 간: backend → game-engine).

JWT(get_current_user)와 별개. 호출자가 backend(신뢰 서비스)임을 증명하는 용도.
사용자 신원(본인 검증)은 backend 가 JWT 로 처리하고 user_id 를 path 로 넘김.
키 비교는 timing attack 방어로 secrets.compare_digest 사용.
"""
from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status

from app.core.config import settings


def verify_internal_api_key(
    x_internal_api_key: str | None = Header(default=None, alias="X-Internal-Api-Key"),
) -> None:
    """X-Internal-Api-Key 헤더 검증. 없거나 불일치 → 401.

    I/O 없는 순수 비교라 sync (FastAPI 가 threadpool 에서 실행).
    """
    if x_internal_api_key is None or not secrets.compare_digest(
        x_internal_api_key, settings.internal_api_key
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal API key",
        )