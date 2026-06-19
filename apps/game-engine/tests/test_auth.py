"""JWT get_current_user dependency 단위 테스트.

auth-boundary v1 §3 규약 5개 시나리오:
1. 유효 USER 토큰 → payload 반환 (user_id=int, role='USER')
2. 만료 토큰 → 401 'Token has expired'
3. 위조 토큰(잘못된 secret) → 401 'Could not validate credentials'
4. GUEST role → 403 'Game requires user account'
5. sub 누락 토큰 → 401 (require 가 InvalidTokenError → 'Could not validate credentials')
6. Bearer 헤더 없음 → 403 (HTTPBearer auto_error=True 기본 → FastAPI 403)
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.core import auth as auth_module
from app.core.auth import get_current_user

TEST_SECRET = "test-secret-min-32-bytes-long-stringx"


@pytest.fixture(autouse=True)
def _override_secret(monkeypatch):
    """모든 테스트에서 settings.jwt_secret 을 TEST_SECRET 으로."""
    monkeypatch.setattr(auth_module.settings, "jwt_secret", TEST_SECRET)
    yield


@pytest.fixture
def app_with_protected_route() -> FastAPI:
    """get_current_user 가 제대로 동작하는지 검증할 mini app."""
    app = FastAPI()

    @app.get("/protected")
    async def protected(user: dict = Depends(get_current_user)):
        return user

    return app


@pytest.fixture
def client(app_with_protected_route) -> TestClient:
    return TestClient(app_with_protected_route)


def _make_token(
    *,
    sub: str | None = "42",
    role: str | None = "USER",
    exp_offset_seconds: int = 300,
    include_sub: bool = True,
    include_role: bool = True,
    include_exp: bool = True,
    secret: str = TEST_SECRET,
) -> str:
    """헬퍼: 다양한 payload 조합으로 토큰 발급."""
    payload: dict = {}
    if include_sub and sub is not None:
        payload["sub"] = sub
    if include_role and role is not None:
        payload["role"] = role
    if include_exp:
        payload["exp"] = int(
            (datetime.now(UTC) + timedelta(seconds=exp_offset_seconds)).timestamp()
        )
    return jwt.encode(payload, secret, algorithm="HS256")


def test_valid_user_token_returns_payload(client: TestClient):
    token = _make_token(sub="42", role="USER")
    res = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == 42
    assert body["role"] == "USER"
    assert "payload" in body


def test_expired_token_returns_401_token_expired(client: TestClient):
    token = _make_token(exp_offset_seconds=-60)  # 이미 만료
    res = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Token has expired"


def test_forged_token_returns_401_could_not_validate(client: TestClient):
    forged = _make_token(secret="some-other-attacker-secret-32-bytes-x")
    res = client.get("/protected", headers={"Authorization": f"Bearer {forged}"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Could not validate credentials"


def test_guest_role_returns_403_game_requires_user(client: TestClient):
    token = _make_token(role="GUEST")
    res = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.json()["detail"] == "Game requires user account"


def test_missing_sub_claim_returns_401(client: TestClient):
    """require=['sub'] 가 InvalidTokenError → 401 Could not validate credentials."""
    token = _make_token(include_sub=False)
    res = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Could not validate credentials"


def test_missing_role_claim_returns_401(client: TestClient):
    token = _make_token(include_role=False)
    res = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    # require=['role'] catch → InvalidTokenError → Could not validate credentials
    assert res.json()["detail"] == "Could not validate credentials"


def test_missing_authorization_header_returns_403_or_401(client: TestClient):
    """HTTPBearer auto_error=True 의 기본은 403 (FastAPI 0.115+)."""
    res = client.get("/protected")
    # 둘 다 인증 누락 의미. 어느 코드든 401/403 이면 통과.
    assert res.status_code in (401, 403)


def test_non_integer_sub_returns_401(client: TestClient):
    """sub 가 정수 변환 불가 → 401 Token subject invalid."""
    token = _make_token(sub="not-a-number")
    res = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Token subject invalid"
