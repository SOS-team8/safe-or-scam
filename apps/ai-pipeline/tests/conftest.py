"""Pytest 공통 fixtures."""
import pytest


@pytest.fixture
def sample_scenario_v1_dict() -> dict:
    """기존 disk JSON (v1, `id` 필드) 형태의 시나리오 dict."""
    from datetime import datetime, timezone
    return {
        "id": "scenario_v1test",
        "title": "v1 시나리오",
        "description": "v1 스키마 호환 검증용",
        "phishing_type": "smishing",
        "difficulty": "medium",
        "root_node_id": "node_001",
        "nodes": {
            "node_001": {
                "id": "node_001",
                "type": "narrative",
                "text": "안녕하세요",
                "choices": [
                    {
                        "id": "node_001_c1",
                        "text": "응답한다",
                        "next_node_id": "node_002",
                        "is_dangerous": False,
                        "resource_effect": {"trust": 0, "money": 0, "awareness": 0},
                        "danger_feedback": None,
                    },
                ],
                "educational_content": None,
                "image_url": None,
                "image_prompt": None,
                "depth": 0,
                "parent_node_id": None,
                "parent_choice_id": None,
            },
            "node_002": {
                "id": "node_002",
                "type": "ending_good",
                "text": "안전합니다",
                "choices": [],
                "educational_content": None,
                "image_url": None,
                "image_prompt": None,
                "depth": 1,
                "parent_node_id": "node_001",
                "parent_choice_id": "node_001_c1",
            },
        },
        "protagonist": None,
        "prologue": None,
        "created_at": datetime(2026, 5, 18, tzinfo=timezone.utc).isoformat(),
        "metadata": {"any": "value"},  # v1에 존재했던 필드 (v2에서 제거)
    }


@pytest.fixture
def sample_phishing_article():
    """샘플 PhishingArticle."""
    from datetime import datetime, timezone
    from app.models.news import PhishingArticle
    return PhishingArticle(
        url="https://example.com/news/1",
        title="피싱 뉴스 샘플",
        source="example",
        published_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
        body="피싱 사건이 발생했습니다.",
        phishing_type="smishing",
        victim_profile="60대 남성",
        scammer_persona="택배기사",
        initial_contact="문자",
        persuasion_tactics=["긴급함 강조"],
        requested_actions=["링크 클릭"],
        red_flags=["짧은 URL"],
        damage_amount="100만원",
        scenario_seed="시나리오 시드",
    )
