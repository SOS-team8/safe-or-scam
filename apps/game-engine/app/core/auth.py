"""JWT 인증 dependency.

auth-boundary v1 §3 그대로 구현. PyJWT (ADR-004) + HS256.
backend 가 발급한 토큰을 game-engine 이 동일 JWT_SECRET 으로 검증.
"""
from __future__ import annotations

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.core.config import settings

security = HTTPBearer(auto_error=True)


def decode_access_token(token: str) -> dict:
    """access token 을 검증·디코드. 실패 시 401 raise.

    `options.require` 로 필수 claim (sub, role, exp) 부재를 InvalidTokenError 로 강제.
    """
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            options={"require": ["sub", "role", "exp"]},
        )
    except ExpiredSignatureError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
    except InvalidTokenError as e:
        # 임시 디버깅: 정확한 사유 노출
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {type(e).__name__}: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """모든 game-engine 라우트의 인증 의존성.

    role=GUEST 는 게임 불가 → 403. USER 만 통과.
    `sub` 는 string 으로 발급되므로 `int(sub)` 변환 (JJWT/PyJWT 호환).
    """
    payload = decode_access_token(credentials.credentials)

    sub = payload.get("sub")
    if sub is None:
        # require=["sub"] 가 보통 catch 하지만 방어적으로 한 번 더.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )

    role = payload.get("role")
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing role",
        )

    if role == "GUEST":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Game requires user account",
        )

    try:
        user_id = int(sub)
    except (TypeError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject invalid",
        ) from e

    return {"user_id": user_id, "role": role, "payload": payload}
