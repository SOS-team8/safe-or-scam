"""ai-pipeline의 /api/v1/images StaticFiles 마운트 검증.

MongoDB scenarios.nodes[*].image_url 은 /api/v1/images/scenario_xxx/node_xxx.png
형태의 상대 경로이며, 본 라우트는 IMAGES_DIR 하위에서 정적 파일을 서빙한다.

- 디렉토리 존재 시 → mount 등록되어 200/404 (파일 유무)로 응답.
- 디렉토리 미존재 시 → mount 생략, 404 (Not Found from app)로 응답해도 무방.
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient


def _make_app_with_images_dir(images_dir: Path) -> FastAPI:
    """settings.images_dir을 주입한 새로운 app을 만든다.

    app.main을 새로 import하면 mount가 module-level에서 실행되므로,
    settings을 monkeypatch 후 importlib.reload로 강제 재실행한다.
    """
    import importlib

    from app import config as cfg_mod

    cfg_mod.settings.images_dir = str(images_dir)

    import app.main as main_mod  # noqa: WPS433

    importlib.reload(main_mod)
    return main_mod.app


def test_images_mount_serves_existing_file(tmp_path: Path, monkeypatch):
    """images_dir에 파일이 있으면 /api/v1/images/<rel> 로 서빙된다."""
    scenario_dir = tmp_path / "scenario_test"
    scenario_dir.mkdir()
    payload = b"\x89PNG\r\n\x1a\nFAKEIMG"
    (scenario_dir / "node_1.png").write_bytes(payload)

    app = _make_app_with_images_dir(tmp_path)

    with TestClient(app) as client:
        res = client.get("/api/v1/images/scenario_test/node_1.png")
        assert res.status_code == 200, res.text
        assert res.content == payload


def test_images_mount_returns_404_for_missing(tmp_path: Path, monkeypatch):
    """디렉토리는 있지만 파일이 없으면 404."""
    app = _make_app_with_images_dir(tmp_path)

    with TestClient(app) as client:
        res = client.get("/api/v1/images/scenario_x/node_x.png")
        assert res.status_code == 404


def test_images_mount_skipped_when_dir_missing(tmp_path: Path, monkeypatch):
    """존재하지 않는 디렉토리 경로일 때 mount 생략 — 호출 시에도 raise 없이 404."""
    nonexistent = tmp_path / "does_not_exist"
    app = _make_app_with_images_dir(nonexistent)

    with TestClient(app) as client:
        res = client.get("/api/v1/images/scenario_x/node_x.png")
        # mount가 없으면 FastAPI 기본 404.
        assert res.status_code == 404
