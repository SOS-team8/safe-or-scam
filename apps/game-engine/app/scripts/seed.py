"""시나리오 + 예시 데이터 시드 CLI.

실행:
    uv run python -m app.scripts.seed

사전 조건 (환경변수):
    MONGO_URL        — MongoDB 연결 문자열
    MONGO_DB         — 데이터베이스 이름
    SCENARIOS_DIR    — 시나리오 JSON 파일 디렉토리 (절대경로)

동작:
    1. SCENARIOS_DIR/scenario_*.json (하위 progress/ 제외) glob
    2. 각 시나리오를 scenarios 컬렉션에 upsert (idempotent)
       - metadata 필드 제외
       - nodes 순회하여 total_endings / total_good_endings / total_bad_endings 파생
       - JSON tags 보존, updated_at=now
    3. 예시 데이터 시드 (user_id=1):
       - 완료된 플레이 2건: good ending 1, bad ending 1
       - 진행 중 세션 1건
       - 모든 예시는 고정 id로 idempotent upsert
"""
from __future__ import annotations

import asyncio
import json
import sys
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.core.config import settings
from app.models.common import Resources
from app.models.game_session import ChoiceHistoryEntry, GameSession
from app.models.play_log import PlayLog
from app.models.scenario import Scenario
from app.models.user_scenario_progress import UserScenarioProgress

EXAMPLE_USER_ID = 1


def _derive_ending_counts(nodes: dict[str, dict[str, Any]]) -> tuple[int, int, int]:
    """노드 dict에서 엔딩 타입별 개수 계산."""
    c = Counter(n["type"] for n in nodes.values())
    good = c.get("ending_good", 0)
    bad = c.get("ending_bad", 0)
    return good + bad, good, bad


def _load_scenario_json(file_path: Path) -> dict[str, Any]:
    with file_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _scenario_id(raw: dict[str, Any]) -> str:
    """신/구 시나리오 JSON 키를 모두 지원."""
    return raw.get("scenario_id") or raw["id"]


def _to_scenario_doc(raw: dict[str, Any]) -> Scenario:
    """JSON dict → Scenario Document.

    - `id` 또는 `scenario_id` → `scenario_id`
    - `metadata` 제외
    - 파생 필드 계산
    - JSON tags 보존, `updated_at=now`
    """
    total, good, bad = _derive_ending_counts(raw["nodes"])
    now = datetime.now(UTC)
    return Scenario(
        scenario_id=_scenario_id(raw),
        title=raw["title"],
        description=raw["description"],
        phishing_type=raw["phishing_type"],
        difficulty=raw["difficulty"],
        root_node_id=raw["root_node_id"],
        nodes=raw["nodes"],
        protagonist=raw.get("protagonist"),
        prologue=raw.get("prologue"),
        total_endings=total,
        total_good_endings=good,
        total_bad_endings=bad,
        # ending_classifier 결과 보존 — 누락 시 재시드가 ending_categories 를 None 으로
        # 덮어써 유형 기준 진행도가 조용히 죽음(total 0 → rate 0). ai-pipeline 미러와 동일 컬렉션.
        ending_categories=raw.get("ending_categories"),
        tags=raw.get("tags", []),
        created_at=raw["created_at"],
        updated_at=now,
    )


async def _upsert_scenario(doc: Scenario) -> bool:
    """scenario_id 기준 upsert. 새로 insert면 True, update면 False."""
    existing = await Scenario.find_one(Scenario.scenario_id == doc.scenario_id)
    if existing is None:
        await doc.insert()
        return True
    # 필드 덮어쓰기 (id는 유지)
    update_data = doc.model_dump(exclude={"id"})
    await existing.set(update_data)
    return False


async def _seed_scenarios() -> int:
    """SCENARIOS_DIR에서 시나리오 로드 후 upsert. 처리한 개수 반환."""
    if not settings.scenarios_dir:
        raise SystemExit(
            "SCENARIOS_DIR required for seeding. "
            "Set it in .env or shell before running this script."
        )
    scenarios_path = Path(settings.scenarios_dir)
    if not scenarios_path.is_dir():
        raise SystemExit(f"SCENARIOS_DIR is not a directory: {scenarios_path}")

    # 하위 progress/ 디렉토리는 제외 (파이프라인 중간 산출물)
    files = sorted(scenarios_path.glob("scenario_*.json"))
    files = [f for f in files if "progress" not in f.parts]

    if not files:
        print(f"[warn] no scenario_*.json files found in {scenarios_path}")
        return 0

    inserted = 0
    updated = 0
    for f in files:
        raw = _load_scenario_json(f)
        doc = _to_scenario_doc(raw)
        is_new = await _upsert_scenario(doc)
        if is_new:
            inserted += 1
        else:
            updated += 1
        print(f"  [{'insert' if is_new else 'update'}] {doc.scenario_id}")

    print(f"scenarios: {inserted} inserted, {updated} updated")
    return len(files)


def _first_ending_path(scenario_raw: dict[str, Any], ending_type: str) -> list[int]:
    """지정된 ending_type의 첫 번째 도달 가능한 노드까지의 0-based choice index 경로.

    BFS로 root부터 탐색하면서 각 노드에 (parent, choice_index)를 기록해 경로 복원.
    """
    nodes = scenario_raw["nodes"]
    root_id = scenario_raw["root_node_id"]

    # parent_map[node_id] = (parent_id, choice_index)
    parent_map: dict[str, tuple[str, int]] = {}
    queue: list[str] = [root_id]
    visited = {root_id}
    target: str | None = None

    while queue:
        cur_id = queue.pop(0)
        cur = nodes[cur_id]
        if cur["type"] == ending_type:
            target = cur_id
            break
        for idx, choice in enumerate(cur.get("choices", [])):
            nxt = choice.get("next_node_id")
            if nxt and nxt in nodes and nxt not in visited:
                visited.add(nxt)
                parent_map[nxt] = (cur_id, idx)
                queue.append(nxt)

    if target is None:
        return []

    path: list[int] = []
    node_id = target
    while node_id in parent_map:
        parent_id, idx = parent_map[node_id]
        path.append(idx)
        node_id = parent_id
    path.reverse()
    return path


def _final_node_from_path(scenario_raw: dict[str, Any], path: list[int]) -> str:
    """경로(choice index 배열)를 따라 최종 노드 id 반환."""
    nodes = scenario_raw["nodes"]
    cur_id = scenario_raw["root_node_id"]
    for idx in path:
        cur = nodes[cur_id]
        cur_id = cur["choices"][idx]["next_node_id"]
    return cur_id


async def _seed_example_data(scenarios_dir: Path) -> None:
    """user_id=1 기준 예시 데이터 시드.

    - 2개 시나리오 완료 (good 1, bad 1)
    - 1개 시나리오 진행 중 (playing)
    모두 고정 id 사용 → 재실행 시 upsert.
    """
    files = sorted(scenarios_dir.glob("scenario_*.json"))
    files = [f for f in files if "progress" not in f.parts]
    if len(files) < 3:
        print("[warn] need at least 3 scenarios for example data")
        return

    now = datetime.now(UTC)

    # --- 완료 1: good ending ---
    sc_a = _load_scenario_json(files[0])
    path_a = _first_ending_path(sc_a, "ending_good")
    final_a = _final_node_from_path(sc_a, path_a) if path_a else sc_a["root_node_id"]

    await _upsert_by_key(
        PlayLog,
        "log_id",
        PlayLog(
            log_id="example_log_1",
            scenario_id=_scenario_id(sc_a),
            user_id=EXAMPLE_USER_ID,
            path=path_a,
            final_node_id=final_a,
            ending_type="ending_good",
            final_resource=Resources(trust=2, money=4, awareness=4),
            total_score=80,
            dangerous_count=0,
            total_choices=len(path_a),
            phishing_type=sc_a["phishing_type"],
            duration_seconds=180,
            completed_at=now,
        ),
    )
    await _upsert_by_key(
        GameSession,
        "session_id",
        GameSession(
            session_id="example_session_completed_1",
            scenario_id=_scenario_id(sc_a),
            user_id=EXAMPLE_USER_ID,
            current_node_id=final_a,
            resources=Resources(trust=2, money=4, awareness=4),
            choices_history=[],
            dangerous_count=0,
            visited_endings=[final_a],
            status="completed",
            started_at=now,
            completed_at=now,
        ),
    )
    await _upsert_progress(sc_a, [final_a], now)

    # --- 완료 2: bad ending ---
    sc_b = _load_scenario_json(files[1])
    path_b = _first_ending_path(sc_b, "ending_bad")
    final_b = _final_node_from_path(sc_b, path_b) if path_b else sc_b["root_node_id"]

    await _upsert_by_key(
        PlayLog,
        "log_id",
        PlayLog(
            log_id="example_log_2",
            scenario_id=_scenario_id(sc_b),
            user_id=EXAMPLE_USER_ID,
            path=path_b,
            final_node_id=final_b,
            ending_type="ending_bad",
            final_resource=Resources(trust=4, money=0, awareness=1),
            total_score=20,
            dangerous_count=2,
            total_choices=len(path_b),
            phishing_type=sc_b["phishing_type"],
            duration_seconds=120,
            completed_at=now,
        ),
    )
    await _upsert_by_key(
        GameSession,
        "session_id",
        GameSession(
            session_id="example_session_completed_2",
            scenario_id=_scenario_id(sc_b),
            user_id=EXAMPLE_USER_ID,
            current_node_id=final_b,
            resources=Resources(trust=4, money=0, awareness=1),
            choices_history=[],
            dangerous_count=2,
            visited_endings=[final_b],
            status="completed",
            started_at=now,
            completed_at=now,
        ),
    )
    await _upsert_progress(sc_b, [final_b], now)

    # --- 진행 중 세션 ---
    sc_c = _load_scenario_json(files[2])
    await _upsert_by_key(
        GameSession,
        "session_id",
        GameSession(
            session_id="example_session_playing_1",
            scenario_id=_scenario_id(sc_c),
            user_id=EXAMPLE_USER_ID,
            current_node_id=sc_c["root_node_id"],
            resources=Resources(),  # 기본값 (3/3/1)
            choices_history=[],
            dangerous_count=0,
            visited_endings=[],
            status="playing",
            started_at=now,
            completed_at=None,
        ),
    )

    print(
        "examples: 2 play_logs, 3 game_sessions "
        "(2 completed + 1 playing), 2 user_scenario_progress"
    )


async def _upsert_by_key(model_cls, key_field: str, doc) -> None:
    """단일 비즈니스 키 기준 upsert."""
    key_value = getattr(doc, key_field)
    existing = await model_cls.find_one({key_field: key_value})
    if existing is None:
        await doc.insert()
    else:
        await existing.set(doc.model_dump(exclude={"id"}))


async def _upsert_progress(
    scenario_raw: dict[str, Any],
    discovered_node_ids: list[str],
    now: datetime,
) -> None:
    """user_scenario_progress upsert (결말 유형 category 기준).

    도달 결말 노드(discovered_node_ids)를 node.ending_category 로 매핑해 distinct 유형 수집.
    분모 = 시나리오 결말 유형 수(len(ending_categories)). 미분류/dangling 카테고리는 제외.
    """
    nodes = scenario_raw["nodes"]
    ending_categories = scenario_raw.get("ending_categories") or {}
    total = len(ending_categories)
    discovered_categories: list[str] = []
    for node_id in discovered_node_ids:
        cat = (nodes.get(node_id) or {}).get("ending_category")
        if cat and cat in ending_categories and cat not in discovered_categories:
            discovered_categories.append(cat)
    rate = len(discovered_categories) / total if total > 0 else 0.0
    existing = await UserScenarioProgress.find_one(
        {"user_id": EXAMPLE_USER_ID, "scenario_id": _scenario_id(scenario_raw)}
    )
    doc = UserScenarioProgress(
        user_id=EXAMPLE_USER_ID,
        scenario_id=_scenario_id(scenario_raw),
        discovered_categories=discovered_categories,
        total_categories=total,
        completion_rate=rate,
        play_count=1,
        last_played_at=now,
    )
    if existing is None:
        await doc.insert()
    else:
        await existing.set(doc.model_dump(exclude={"id"}))


async def main() -> None:
    client = AsyncMongoClient(settings.mongo_url)
    await init_beanie(
        database=client[settings.mongo_db],
        document_models=[Scenario, GameSession, PlayLog, UserScenarioProgress],
    )
    try:
        count = await _seed_scenarios()
        if count > 0 and settings.scenarios_dir:
            await _seed_example_data(Path(settings.scenarios_dir))
    finally:
        await client.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except SystemExit as e:
        print(f"[error] {e}", file=sys.stderr)
        raise
