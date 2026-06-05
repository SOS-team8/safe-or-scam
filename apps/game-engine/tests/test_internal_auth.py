"""internal API Key 인증 — 보안 컨트롤 회귀 방지 (Phase 1)."""
import pytest
from fastapi import HTTPException

from app.core.internal_auth import verify_internal_api_key


def test_missing_key_raises_401():
    with pytest.raises(HTTPException) as exc:
        verify_internal_api_key(x_internal_api_key=None)
    assert exc.value.status_code == 401


def test_wrong_key_raises_401():
    with pytest.raises(HTTPException) as exc:
        verify_internal_api_key(x_internal_api_key="definitely-not-the-key")
    assert exc.value.status_code == 401