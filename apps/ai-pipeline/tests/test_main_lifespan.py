"""FastAPI lifespan에 MongoDB init/close가 등록되어 있는지 검증."""
import pytest
from fastapi.testclient import TestClient


def test_main_app_imports():
    """app 객체 자체가 정상 import."""
    from app.main import app
    assert app is not None


@pytest.mark.asyncio
async def test_lifespan_calls_init_and_close(monkeypatch):
    """startup에서 init_mongo, shutdown에서 close_mongo가 호출됨을 확인."""
    init_called = {"v": False}
    close_called = {"v": False}

    async def fake_init():
        init_called["v"] = True

    async def fake_close():
        close_called["v"] = True

    # app.main 모듈이 db.mongo의 함수를 사용한다고 가정.
    # 직접 patch:
    from app.db import mongo as mongo_mod
    monkeypatch.setattr(mongo_mod, "init_mongo", fake_init)
    monkeypatch.setattr(mongo_mod, "close_mongo", fake_close)

    # app.main이 mongo_mod 함수를 호출하는지 검증.
    from app.main import app

    with TestClient(app):
        # entered context → startup 실행됨
        assert init_called["v"] is True

    # exited context → shutdown 실행됨
    assert close_called["v"] is True
