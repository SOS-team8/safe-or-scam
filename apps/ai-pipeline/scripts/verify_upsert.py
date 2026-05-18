"""Pre-existing 데이터를 활용한 MongoDB upsert 검증 (no LLM calls).

사용법:
    cd apps/ai-pipeline
    MONGODB_URL='mongodb://sos_user:localpass123@localhost:27017/sos_db?authSource=admin' \\
        MONGODB_DB=sos_db \\
        uv run python scripts/verify_upsert.py

이 스크립트는:
1) /Users/chris40461/workspace/data/news_cache/articles_latest.json에서 PhishingArticle 로드
2) /Users/chris40461/workspace/data/scenarios/scenario_*.json 일부 로드 (3개)
3) init_mongo() + upsert + 검증 (count) 후 close_mongo()
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

# allow running directly without pip install -e
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import mongo as mongo_mod  # noqa: E402
from app.models.news import PhishingArticle  # noqa: E402
from app.models.scenario import ScenarioTree  # noqa: E402

DATA_ROOT = Path("/Users/chris40461/workspace/data")


async def verify_news_articles():
    src = DATA_ROOT / "news_cache" / "articles_latest.json"
    if not src.exists():
        print(f"[SKIP] news_cache 없음: {src}")
        return
    data = json.loads(src.read_text(encoding="utf-8"))
    articles_raw = data.get("articles", [])[:5]  # 처음 5개만
    inserted = 0
    updated = 0
    for raw in articles_raw:
        try:
            article = PhishingArticle(**raw)
        except Exception as exc:
            print(f"  [skip] parse 실패: {exc}")
            continue
        result = await mongo_mod.upsert_phishing_article(article)
        if result["upserted_id"]:
            inserted += 1
        else:
            updated += 1
    db = mongo_mod.get_db()
    total = await db.news_articles.count_documents({})
    print(
        f"[news_articles] upsert: inserted={inserted}, updated={updated}, "
        f"collection_total={total}"
    )


async def verify_scenarios():
    src_dir = DATA_ROOT / "scenarios"
    if not src_dir.exists():
        print(f"[SKIP] scenarios 없음: {src_dir}")
        return
    paths = sorted(src_dir.glob("scenario_*.json"))[:3]
    inserted = 0
    updated = 0
    for p in paths:
        raw = json.loads(p.read_text(encoding="utf-8"))
        try:
            tree = ScenarioTree.model_validate(raw)
        except Exception as exc:
            print(f"  [skip] {p.name} parse 실패: {exc}")
            continue
        result = await mongo_mod.upsert_scenario(tree)
        if result["upserted_id"]:
            inserted += 1
        else:
            updated += 1
    db = mongo_mod.get_db()
    total = await db.scenarios.count_documents({})
    print(
        f"[scenarios] upsert: inserted={inserted}, updated={updated}, "
        f"collection_total={total}"
    )


async def main():
    print(f"Connecting to {mongo_mod.settings.mongodb_url} / {mongo_mod.settings.mongodb_db}")
    try:
        await mongo_mod.init_mongo()
    except Exception as exc:
        print(f"[FAIL] init_mongo: {exc}")
        return 1
    try:
        await verify_news_articles()
        await verify_scenarios()
    finally:
        await mongo_mod.close_mongo()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
