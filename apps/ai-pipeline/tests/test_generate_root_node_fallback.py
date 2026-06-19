"""generate_root_node / generate_node가 absolutely None을 반환하지 않음을 보증 (P0-012).

기존 코드는 retry loop 마지막 attempt에서 fallback return이 있지만,
정적 분석상 마지막 함수 끝까지 흐름이 빠질 가능성이 있어 명시적 raise로 차단해야 함.
"""
import inspect

import pytest

from app.pipeline import node_generator


def test_generate_root_node_has_explicit_terminal_raise():
    """함수 마지막에 raise 또는 return이 있어야 한다 (None fallthrough 차단)."""
    src = inspect.getsource(node_generator.generate_root_node)
    # 함수 끝 라인 중 마지막 5줄 안에 raise 또는 return이 있어야 함
    lines = [ln.rstrip() for ln in src.splitlines() if ln.strip()]
    last_5 = "\n".join(lines[-7:])
    assert "raise" in last_5 or "return" in last_5
    # 추가: 명시적으로 함수 종료 후 None 반환 가능성을 막는 raise 패턴이 있는지
    assert "raise RuntimeError" in src or "raise ScenarioGenerationError" in src


def test_generate_node_has_explicit_terminal_raise():
    src = inspect.getsource(node_generator.generate_node)
    lines = [ln.rstrip() for ln in src.splitlines() if ln.strip()]
    last_5 = "\n".join(lines[-7:])
    assert "raise" in last_5 or "return" in last_5
    assert "raise RuntimeError" in src or "raise ScenarioGenerationError" in src


@pytest.mark.asyncio
async def test_generate_root_node_with_zero_retries_raises(monkeypatch):
    """retry_count=-1로 설정해 loop가 한 번도 안 돌면 명시적 raise 발생."""
    from app.config import settings as cfg
    monkeypatch.setattr(cfg, "retry_count", -1)
    with pytest.raises(RuntimeError):
        await node_generator.generate_root_node("smishing", "easy", None)
