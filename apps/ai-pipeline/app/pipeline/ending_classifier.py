"""기존 시나리오의 엔딩 노드를 K-means로 클러스터링하여 카테고리 라벨을 부여.

- `classify_scenario_endings(path)` / `classify_all_scenarios()` — 디스크 JSON 기반 (CLI 호환).
- `classify_tree_in_memory(tree)` — Pydantic ScenarioTree in-memory 분류.
  파이프라인 통합(P0-006)을 위해 tree_builder/_save_scenario 직전에 호출.
  결과를 `tree.ending_categories` + 각 ending 노드 `ending_category`에 채움.
"""

import json
import asyncio
import logging
import os
import numpy as np
from pathlib import Path
from dataclasses import dataclass

import litellm
from openai import OpenAI
from sklearn.cluster import KMeans
from sklearn.preprocessing import normalize

from app.config import settings
from app.models.scenario import EndingCategory, ScenarioTree

logger = logging.getLogger("pipeline.ending_classifier")

SCENARIOS_DIR = Path(__file__).parent.parent / "data" / "scenarios"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "ending_categories"


# ============================================================
# 1. 경로 특성 추출
# ============================================================

@dataclass
class EndingFeature:
    """엔딩 노드의 특성"""
    node_id: str
    ending_type: str              # "ending_good" / "ending_bad"
    ending_text: str              # 엔딩 narrative 텍스트
    depth: int
    # 경로 자원
    final_trust: int = 0
    final_money: int = 0
    final_awareness: int = 0
    # 경로 패턴
    dangerous_count: int = 0
    total_choices: int = 0
    deception_step: int | None = None
    last_choice_dangerous: bool = False
    # 경로 텍스트 (임베딩용)
    path_summary: str = ""


def trace_path(nodes: dict, node_id: str) -> list[dict]:
    """엔딩에서 루트까지 거슬러 올라가며 선택 정보 수집"""
    path_choices = []
    current = nodes[node_id]
    while current.get("parent_node_id"):
        parent = nodes.get(current["parent_node_id"])
        if not parent:
            break
        for c in parent["choices"]:
            if c["id"] == current["parent_choice_id"]:
                path_choices.append(c)
                break
        current = parent
    path_choices.reverse()
    return path_choices


def compute_resources(path_choices: list[dict]) -> tuple[int, int, int]:
    """경로의 누적 자원 계산"""
    t, m, a = 3, 3, 1  # 초기값
    for c in path_choices:
        e = c["resource_effect"]
        t = max(0, min(5, t + e["trust"]))
        m = max(0, min(5, m + e["money"]))
        a = max(0, min(5, a + e["awareness"]))
    return t, m, a


def extract_features(nodes: dict) -> list[EndingFeature]:
    """모든 엔딩 노드의 특성 추출"""
    features = []
    for node in nodes.values():
        if not node["type"].startswith("ending"):
            continue

        path_choices = trace_path(nodes, node["id"])
        t, m, a = compute_resources(path_choices)

        dangerous_flags = [c["is_dangerous"] for c in path_choices]
        deception_step = next(
            (i for i, d in enumerate(dangerous_flags) if d), None
        )

        path_texts = [c["text"][:50] for c in path_choices]
        path_summary = " → ".join(path_texts)

        features.append(EndingFeature(
            node_id=node["id"],
            ending_type=node["type"],
            ending_text=node["text"],
            depth=node["depth"],
            final_trust=t,
            final_money=m,
            final_awareness=a,
            dangerous_count=sum(dangerous_flags),
            total_choices=len(path_choices),
            deception_step=deception_step,
            last_choice_dangerous=dangerous_flags[-1] if dangerous_flags else False,
            path_summary=path_summary,
        ))
    return features


# ============================================================
# 2. 임베딩 + 구조적 특성 결합
# ============================================================

async def get_embeddings(texts: list[str]) -> list[list[float]]:
    """OpenAI embedding API로 텍스트 임베딩 (배치 처리, rate limit 대응)"""
    client = OpenAI(api_key=settings.openai_api_key)
    embeddings = []
    batch_size = 20

    total_batches = (len(texts) + batch_size - 1) // batch_size
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_num = i // batch_size + 1
        logger.info(f"  임베딩 배치 {batch_num}/{total_batches}: {len(batch)}개")

        for attempt in range(3):
            try:
                result = client.embeddings.create(
                    model=settings.embedding_model,
                    input=batch,
                )
                for emb in result.data:
                    embeddings.append(emb.embedding)
                break
            except Exception as e:
                if "429" in str(e) and attempt < 2:
                    wait = (attempt + 1) * 15
                    logger.warning(f"  Rate limit, {wait}초 대기 후 재시도...")
                    await asyncio.sleep(wait)
                else:
                    raise

        # 배치 간 대기
        if i + batch_size < len(texts):
            await asyncio.sleep(5)

    return embeddings


def build_feature_matrix(
    features: list[EndingFeature],
    embeddings: list[list[float]],
    structural_weight: float = 0.3,
) -> np.ndarray:
    """구조적 특성 + 텍스트 임베딩을 하나의 행렬로 결합"""
    # 구조적 특성 (7차원)
    structural = []
    for f in features:
        structural.append([
            f.final_trust / 5.0,
            f.final_money / 5.0,
            f.final_awareness / 5.0,
            f.dangerous_count / max(f.total_choices, 1),
            (f.deception_step if f.deception_step is not None else 0) / 5.0,
            1.0 if f.last_choice_dangerous else 0.0,
            1.0 if f.ending_type == "ending_bad" else 0.0,
        ])
    structural = np.array(structural)

    # 텍스트 임베딩
    semantic = np.array(embeddings)

    # 정규화
    structural = normalize(structural)
    semantic = normalize(semantic)

    # 가중 결합: 구조 30% + 서사 70%
    combined = np.hstack([
        structural * structural_weight,
        semantic * (1 - structural_weight),
    ])
    return combined


# ============================================================
# 3. K-means 클러스터링
# ============================================================

def cluster_endings(feature_matrix: np.ndarray, n_clusters: int = 10) -> np.ndarray:
    """K-means 클러스터링"""
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(feature_matrix)
    return labels


# ============================================================
# 4. LLM으로 카테고리 이름/설명 생성
# ============================================================

async def generate_category_names(
    features: list[EndingFeature],
    labels: np.ndarray,
    n_clusters: int,
    phishing_type: str,
) -> list[dict]:
    """각 클러스터의 대표 엔딩을 LLM에 보내서 카테고리 이름/설명 생성"""
    categories = []

    for cluster_id in range(n_clusters):
        cluster_features = [
            f for f, label in zip(features, labels) if label == cluster_id
        ]
        if not cluster_features:
            continue

        samples = cluster_features[:5]
        good_count = sum(1 for f in cluster_features if f.ending_type == "ending_good")
        bad_count = len(cluster_features) - good_count
        cluster_type = "good" if good_count > bad_count else "bad"

        avg_t = sum(f.final_trust for f in cluster_features) / len(cluster_features)
        avg_m = sum(f.final_money for f in cluster_features) / len(cluster_features)
        avg_a = sum(f.final_awareness for f in cluster_features) / len(cluster_features)

        sample_texts = "\n---\n".join([
            f"[경로] {s.path_summary}\n[엔딩] {s.ending_text[:200]}"
            for s in samples
        ])

        prompt = f"""다음은 {phishing_type} 시나리오의 같은 유형으로 분류된 엔딩들입니다.

[클러스터 정보]
- 엔딩 수: {len(cluster_features)}개
- good/bad: {good_count}/{bad_count}
- 평균 자원: trust={avg_t:.1f}, money={avg_m:.1f}, awareness={avg_a:.1f}

[대표 엔딩 샘플]
{sample_texts}

이 엔딩 그룹을 대표하는 카테고리를 만들어주세요.

출력 JSON:
{{
  "name": "짧은 카테고리 이름 (10자 이내)",
  "description": "이 카테고리의 특징 설명 (1~2문장)"
}}"""

        result = None
        for attempt in range(6):
            try:
                response = await litellm.acompletion(
                    model=settings.llm_model,
                    messages=[
                        {"role": "system", "content": "당신은 보이스피싱 교육 게임의 엔딩 분류 전문가입니다. 반드시 JSON으로만 응답하세요."},
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                    api_key=settings.openai_api_key,
                    timeout=30,
                )
                result = json.loads(response.choices[0].message.content)
                break
            except Exception as e:
                if "429" in str(e) and attempt < 5:
                    wait = (attempt + 1) * 30
                    logger.warning(f"  C{cluster_id + 1} rate limit, {wait}초 대기 후 재시도 ({attempt+1}/6)...")
                    await asyncio.sleep(wait)
                else:
                    logger.warning(f"카테고리 이름 생성 실패 (C{cluster_id + 1}): {e}")
                    break

        if result is None:
            result = {
                "name": f"유형 {cluster_id + 1}",
                "description": f"자동 분류된 엔딩 그룹 ({cluster_type})"
            }

        categories.append({
            "id": f"C{cluster_id + 1}",
            "name": result["name"],
            "type": cluster_type,
            "description": result["description"],
            "ending_node_ids": [f.node_id for f in cluster_features],
            "count": len(cluster_features),
            "avg_resources": {
                "trust": round(avg_t, 1),
                "money": round(avg_m, 1),
                "awareness": round(avg_a, 1),
            },
        })

        # Rate limit 대응 (무료 tier: 분당 5회 제한)
        await asyncio.sleep(15)

    return categories


# ============================================================
# 5. 메인 실행 + 결과 저장
# ============================================================

async def classify_scenario_endings(
    scenario_path: Path,
    n_clusters: int = 10,
) -> dict:
    """시나리오 하나의 엔딩을 클러스터링하여 카테고리 분류"""
    # 1. 시나리오 로드
    data = json.loads(scenario_path.read_text())
    nodes = data["nodes"]
    scenario_id = data["id"]
    phishing_type = data.get("phishing_type", "unknown")

    logger.info(f"=== {scenario_id} 엔딩 분류 시작 ===")

    # 2. 특성 추출
    features = extract_features(nodes)
    if not features:
        logger.warning(f"{scenario_id}: 엔딩 노드 없음, 건너뜀")
        return {}
    logger.info(f"  엔딩 {len(features)}개 특성 추출 완료")

    # 클러스터 수 조정: 엔딩 수가 적으면 줄임
    actual_k = min(n_clusters, len(features))
    if actual_k < n_clusters:
        logger.info(f"  엔딩 수({len(features)})가 적어 K={actual_k}로 조정")

    # 3. 텍스트 임베딩
    texts = [f"{f.ending_text} {f.path_summary}" for f in features]
    embeddings = await get_embeddings(texts)
    logger.info(f"  임베딩 {len(embeddings)}개 생성 완료")

    # 4. 특성 행렬 구성 + 클러스터링
    matrix = build_feature_matrix(features, embeddings)
    labels = cluster_endings(matrix, n_clusters=actual_k)
    logger.info(f"  K-means 클러스터링 완료 (K={actual_k})")

    # 5. LLM으로 카테고리 이름 생성
    categories = await generate_category_names(
        features, labels, actual_k, phishing_type
    )
    logger.info(f"  카테고리 {len(categories)}개 이름 생성 완료")

    # 6. node → category 매핑
    node_to_category = {}
    for f, label in zip(features, labels):
        node_to_category[f.node_id] = f"C{label + 1}"

    # 7. 결과 구성
    result = {
        "scenario_id": scenario_id,
        "phishing_type": phishing_type,
        "total_endings": len(features),
        "num_categories": len(categories),
        "categories": categories,
        "node_to_category": node_to_category,
    }

    # 8. 저장
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{scenario_id}.json"
    with open(output_path, "w", encoding="utf-8") as f_out:
        json.dump(result, f_out, ensure_ascii=False, indent=2)
    logger.info(f"  결과 저장: {output_path}")

    return result


async def classify_all_scenarios(n_clusters: int = 10, scenario_ids: list[str] | None = None):
    """모든 시나리오의 엔딩을 분류 (scenario_ids 지정 시 해당 시나리오만 처리)"""
    if scenario_ids:
        scenario_files = []
        for sid in scenario_ids:
            path = SCENARIOS_DIR / f"{sid}.json"
            if path.exists():
                scenario_files.append(path)
            else:
                print(f"  [경고] 시나리오 파일 없음: {path.name}")
    else:
        scenario_files = sorted(SCENARIOS_DIR.glob("scenario_*.json"))

    if not scenario_files:
        print(f"시나리오 파일 없음: {SCENARIOS_DIR}")
        return

    print(f"=== 엔딩 클러스터링 시작 ({len(scenario_files)}개 시나리오) ===\n")

    for scenario_file in scenario_files:
        try:
            result = await classify_scenario_endings(scenario_file, n_clusters)
            if result:
                print(f"  {result['scenario_id']}: "
                      f"{result['total_endings']}개 엔딩 → {result['num_categories']}개 카테고리")
                for cat in result["categories"]:
                    print(f"    {cat['id']} [{cat['type']:4s}] {cat['name']} ({cat['count']}개)")
                print()
        except Exception as e:
            print(f"  {scenario_file.name}: 실패 — {e}")
            import traceback
            traceback.print_exc()
            print()

    print(f"=== 완료. 결과: {OUTPUT_DIR} ===")


async def fix_fallback_names(scenario_ids: list[str] | None = None):
    """폴백 이름('유형 N')만 LLM으로 재생성 (임베딩/클러스터링 없이)"""
    if scenario_ids:
        files = [OUTPUT_DIR / f"{sid}.json" for sid in scenario_ids]
    else:
        files = sorted(OUTPUT_DIR.glob("scenario_*.json"))

    for filepath in files:
        if not filepath.exists():
            print(f"  [경고] 파일 없음: {filepath.name}")
            continue

        data = json.loads(filepath.read_text())
        scenario_id = data["scenario_id"]
        phishing_type = data.get("phishing_type", "unknown")

        # 시나리오 원본 로드 (대표 엔딩 텍스트 추출용)
        scenario_path = SCENARIOS_DIR / f"{scenario_id}.json"
        if not scenario_path.exists():
            print(f"  [경고] 시나리오 파일 없음: {scenario_path.name}")
            continue
        scenario_data = json.loads(scenario_path.read_text())
        nodes = scenario_data["nodes"]

        fallback_cats = [c for c in data["categories"] if c["name"].startswith("유형 ")]
        if not fallback_cats:
            print(f"  {scenario_id}: 폴백 없음, 스킵")
            continue

        print(f"  {scenario_id}: 폴백 {len(fallback_cats)}개 재생성 중...")

        for cat in fallback_cats:
            # 해당 클러스터의 엔딩 노드에서 대표 텍스트 추출
            ending_node_ids = cat.get("ending_node_ids", [])[:5]
            sample_texts = []
            for nid in ending_node_ids:
                node = nodes.get(nid)
                if node:
                    path_choices = trace_path(nodes, nid)
                    path_summary = " → ".join([c["text"][:50] for c in path_choices])
                    sample_texts.append(f"[경로] {path_summary}\n[엔딩] {node['text'][:200]}")

            if not sample_texts:
                continue

            prompt = f"""다음은 {phishing_type} 시나리오의 같은 유형으로 분류된 엔딩들입니다.

[클러스터 정보]
- 엔딩 수: {cat['count']}개
- 유형: {cat['type']}
- 평균 자원: trust={cat['avg_resources']['trust']}, money={cat['avg_resources']['money']}, awareness={cat['avg_resources']['awareness']}

[대표 엔딩 샘플]
{chr(10).join(sample_texts)}

이 엔딩 그룹을 대표하는 카테고리를 만들어주세요.

출력 JSON:
{{
  "name": "짧은 카테고리 이름 (10자 이내)",
  "description": "이 카테고리의 특징 설명 (1~2문장)"
}}"""

            result = None
            for attempt in range(6):
                try:
                    response = await litellm.acompletion(
                        model=settings.llm_model,
                        messages=[
                            {"role": "system", "content": "당신은 보이스피싱 교육 게임의 엔딩 분류 전문가입니다. 반드시 JSON으로만 응답하세요."},
                            {"role": "user", "content": prompt},
                        ],
                        response_format={"type": "json_object"},
                        api_key=settings.openai_api_key,
                        timeout=30,
                    )
                    result = json.loads(response.choices[0].message.content)
                    break
                except Exception as e:
                    if "429" in str(e) and attempt < 5:
                        wait = (attempt + 1) * 30
                        logger.warning(f"  {cat['id']} rate limit, {wait}초 대기 후 재시도 ({attempt+1}/6)...")
                        await asyncio.sleep(wait)
                    else:
                        logger.warning(f"  {cat['id']} 이름 생성 실패: {e}")
                        break

            if result:
                old_name = cat["name"]
                cat["name"] = result["name"]
                cat["description"] = result["description"]
                print(f"    {cat['id']}: '{old_name}' → '{result['name']}'")
            else:
                print(f"    {cat['id']}: 재생성 실패, 유지")

            await asyncio.sleep(15)

        # 저장
        with open(filepath, "w", encoding="utf-8") as f_out:
            json.dump(data, f_out, ensure_ascii=False, indent=2)
        print(f"  {scenario_id}: 저장 완료\n")

    print("=== 폴백 이름 재생성 완료 ===")


async def classify_tree_in_memory(tree: ScenarioTree) -> ScenarioTree:
    """In-memory ScenarioTree의 ending 노드를 클러스터링하여 tree.ending_categories + node.ending_category에 결과 저장.

    P0-006: tree_builder/_save_scenario 직전에 자동 호출.

    환경변수 `ENABLE_ENDING_CLASSIFIER`가 "1"/"true"가 아닐 경우 no-op (LLM 비용 회피).
    엔딩 노드 < 2개일 경우 클러스터링 의미 없음 — no-op.
    LLM/embedding 호출 실패 시 ending_categories=None 유지 (graceful degradation).

    Returns: 동일 tree 객체 (in-place 갱신).
    """
    enabled = os.getenv("ENABLE_ENDING_CLASSIFIER", "false").lower() in ("1", "true", "yes")
    if not enabled:
        logger.info(
            "ending_classifier 비활성 (ENABLE_ENDING_CLASSIFIER 미설정). tree=%s",
            tree.scenario_id,
        )
        return tree

    ending_nodes = {nid: n for nid, n in tree.nodes.items() if n.type.startswith("ending_")}
    if len(ending_nodes) < 2:
        logger.info(
            "ending_classifier 스킵: ending 노드 %d개 (최소 2개 필요). tree=%s",
            len(ending_nodes), tree.scenario_id,
        )
        return tree

    # ScenarioTree → 디스크 JSON 형태 dict로 변환하여 기존 함수 재사용
    nodes_dict = {
        nid: n.model_dump(mode="json")
        for nid, n in tree.nodes.items()
    }
    try:
        features = extract_features(nodes_dict)
        if not features:
            return tree

        # 클러스터 수 조정
        actual_k = min(10, len(features))

        # 임베딩 + LLM 호출은 비용 큼 — 본 in-memory 경로에서도 동일 흐름
        texts = [f"{f.ending_text} {f.path_summary}" for f in features]
        embeddings = await get_embeddings(texts)
        matrix = build_feature_matrix(features, embeddings)
        labels = cluster_endings(matrix, n_clusters=actual_k)
        categories_raw = await generate_category_names(
            features, labels, actual_k, tree.phishing_type,
        )

        # categories_raw (list[dict]) → dict[str, EndingCategory]
        ending_categories: dict[str, EndingCategory] = {}
        for cat in categories_raw:
            cid = cat["id"]
            ending_categories[cid] = EndingCategory(
                category_id=cid,
                label=cat["name"],
                description=cat["description"],
                node_ids=cat.get("ending_node_ids", []),
            )

        # 각 ending 노드에 category_id 부여
        for f, label in zip(features, labels):
            cid = f"C{label + 1}"
            if f.node_id in tree.nodes:
                tree.nodes[f.node_id].ending_category = cid

        tree.ending_categories = ending_categories
        logger.info(
            "ending_classifier 완료: tree=%s, %d categories", tree.scenario_id, len(ending_categories),
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "ending_classifier 실패 (tree=%s): %s — ending_categories=None 유지",
            tree.scenario_id, str(exc)[:200],
        )
    return tree


# CLI 실행
if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) > 1 and sys.argv[1] == "--fix":
        # 폴백 이름만 재생성 (예: python -m app.pipeline.ending_classifier --fix scenario_f1fb54d2)
        ids = sys.argv[2:] if len(sys.argv) > 2 else None
        asyncio.run(fix_fallback_names(scenario_ids=ids))
    else:
        # 전체 클러스터링 (예: python -m app.pipeline.ending_classifier scenario_67c5fdaa)
        ids = sys.argv[1:] if len(sys.argv) > 1 else None
        asyncio.run(classify_all_scenarios(scenario_ids=ids))
