"""admin 인증 — hmac.compare_digest 적용 (P0-008).

평문 비교는 timing attack 가능. hmac.compare_digest로 constant-time 비교 강제.
"""
import pytest
from fastapi import HTTPException

from app.api import deps
from app.config import settings


def test_require_admin_accepts_correct_token(monkeypatch):
    monkeypatch.setattr(settings, "admin_password", "expected_token_123")
    # 일치 → 예외 없음
    deps.require_admin(admin_token="expected_token_123")


def test_require_admin_rejects_wrong_token(monkeypatch):
    monkeypatch.setattr(settings, "admin_password", "expected_token_123")
    with pytest.raises(HTTPException) as exc:
        deps.require_admin(admin_token="wrong_token_xyz")
    assert exc.value.status_code == 403


def test_require_admin_rejects_different_length_token(monkeypatch):
    """길이 다른 token은 hmac에서 즉시 False — timing attack 차단."""
    monkeypatch.setattr(settings, "admin_password", "expected_token_123")
    with pytest.raises(HTTPException):
        deps.require_admin(admin_token="short")


def test_require_admin_rejects_empty_token(monkeypatch):
    monkeypatch.setattr(settings, "admin_password", "expected_token_123")
    with pytest.raises(HTTPException) as exc:
        deps.require_admin(admin_token=None)
    assert exc.value.status_code == 403


def test_require_admin_rejects_when_admin_password_unset(monkeypatch):
    monkeypatch.setattr(settings, "admin_password", "")
    with pytest.raises(HTTPException) as exc:
        deps.require_admin(admin_token="anything")
    assert exc.value.status_code == 403


def test_require_admin_uses_hmac_compare_digest(monkeypatch):
    """hmac.compare_digest가 실제로 호출되는지 검증 (구현 가이드)."""
    import hmac
    call_count = {"v": 0}
    original = hmac.compare_digest

    def spy(a, b):
        call_count["v"] += 1
        return original(a, b)

    monkeypatch.setattr(hmac, "compare_digest", spy)
    monkeypatch.setattr(settings, "admin_password", "expected_token_123")
    deps.require_admin(admin_token="expected_token_123")
    assert call_count["v"] >= 1
