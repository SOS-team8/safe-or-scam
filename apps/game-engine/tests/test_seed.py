"""seed.py 회귀 가드 — ending_categories 보존 + 유형 기준 예시 progress.

seed 는 전용 pytest 하니스가 없어 여기서 핵심 2가지를 잠근다:
1. _to_scenario_doc 가 ending_categories 를 보존(재시드 시 None clobber 회귀 방지).
   → ai-pipeline 미러와 같은 sos_db.scenarios 를 공유하므로, 이게 누락되면 재시드가
     건강한 ending_categories 를 None 으로 덮어써 유형 기준 진행도가 조용히 죽는다(total 0).
2. _upsert_progress 가 결말 노드 → distinct 유형(category) 으로 매핑.
"""
from __future__ import annotations

from datetime import UTC, datetime

from app.models.user_scenario_progress import UserScenarioProgress
from app.scripts.seed import EXAMPLE_USER_ID, _to_scenario_doc, _upsert_progress

_RAW = {
    "scenario_id": "seed_test",
    "title": "t",
    "description": "d",
    "phishing_type": "smishing",
    "difficulty": "easy",
    "root_node_id": "n0",
    "nodes": {
        "n0": {"id": "n0", "type": "narrative", "text": "x", "choices": []},
        "e1": {
            "id": "e1", "type": "ending_good", "text": "x",
            "choices": [], "ending_category": "C1",
        },
        "e2": {
            "id": "e2", "type": "ending_bad", "text": "y",
            "choices": [], "ending_category": "C2",
        },
    },
    "ending_categories": {
        "C1": {"category_id": "C1", "label": "L1", "description": "D1", "node_ids": ["e1"]},
        "C2": {"category_id": "C2", "label": "L2", "description": "D2", "node_ids": ["e2"]},
    },
    "created_at": datetime(2026, 1, 1, tzinfo=UTC),
    "tags": [],
}


async def test_to_scenario_doc_preserves_ending_categories(test_db):
    """🔴 회귀 가드: _to_scenario_doc 가 ending_categories 를 None 으로 떨구지 않음."""
    doc = _to_scenario_doc(_RAW)
    assert doc.ending_categories is not None
    assert set(doc.ending_categories.keys()) == {"C1", "C2"}
    assert doc.total_endings == 2  # 노드 수(ScenarioSummary)는 그대로 유지


async def test_upsert_progress_maps_node_ids_to_categories(test_db):
    """예시 progress: 결말 노드 → distinct 유형, total=유형 수, rate=유형 기준."""
    await _upsert_progress(_RAW, ["e1"], datetime(2026, 6, 1, tzinfo=UTC))

    p = await UserScenarioProgress.find_one(
        UserScenarioProgress.user_id == EXAMPLE_USER_ID,
        UserScenarioProgress.scenario_id == "seed_test",
    )
    assert p is not None
    assert p.discovered_categories == ["C1"]
    assert p.total_categories == 2
    assert p.completion_rate == 0.5
