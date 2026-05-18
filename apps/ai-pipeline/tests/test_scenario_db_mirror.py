"""ai-pipeline Scenario Beanie Document 미러 검증.

scenario-tree contract v2 §1과 정확히 일치 + game-engine `apps/game-engine/app/models/scenario.py`와도 일치.
"""
from app.models.scenario_db import Scenario


def test_scenario_settings_name():
    assert Scenario.Settings.name == "scenarios"


def test_scenario_required_fields():
    fields = Scenario.model_fields
    expected = {
        "scenario_id",
        "title",
        "description",
        "phishing_type",
        "difficulty",
        "root_node_id",
        "nodes",
        "protagonist",
        "prologue",
        "total_endings",
        "total_good_endings",
        "total_bad_endings",
        "tags",
        "created_at",
        "updated_at",
        "ending_categories",
    }
    assert expected.issubset(set(fields.keys())), (
        f"missing: {expected - set(fields.keys())}"
    )


def test_scenario_indexes_match_contract():
    """contract §1-1: scenario_id unique + phishing_type + difficulty."""
    indexes = Scenario.Settings.indexes
    assert len(indexes) == 3
    # scenario_id unique
    sid_idx = indexes[0]
    doc = sid_idx.document
    assert "unique" in doc and doc["unique"] is True
    assert list(doc["key"].items())[0] == ("scenario_id", 1)
