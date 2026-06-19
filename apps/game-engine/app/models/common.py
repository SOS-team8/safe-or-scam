"""시나리오 트리의 공용 value 모델.

scam-or-safe/backend/app/models/scenario.py의 nested 모델을 복사한 것.
beanie Document(Scenario, GameSession 등)의 필드 타입으로 재사용된다.
"""
from typing import Literal

from pydantic import BaseModel, Field


class Resources(BaseModel):
    """게임 자원 상태 (절대값)."""

    trust: int = Field(default=3, ge=0, le=5)
    money: int = Field(default=3, ge=0, le=5)
    awareness: int = Field(default=1, ge=0, le=5)


class ResourceDelta(BaseModel):
    """선택지의 자원 변동값 (상대값)."""

    trust: int = Field(default=0, ge=-2, le=2)
    money: int = Field(default=0, ge=-2, le=2)
    awareness: int = Field(default=0, ge=-2, le=2)


class ProtagonistProfile(BaseModel):
    age_group: Literal["young adult", "middle-aged", "elderly"]
    gender: Literal["man", "woman"]
    description: str
    appearance: str


class EducationalContent(BaseModel):
    title: str
    explanation: str
    prevention_tips: list[str]
    warning_signs: list[str]


class DangerFeedback(BaseModel):
    why_dangerous: str
    warning_signs: list[str]
    safe_alternative: str


class Choice(BaseModel):
    id: str
    text: str
    next_node_id: str | None = None
    is_dangerous: bool = False
    resource_effect: ResourceDelta = Field(default_factory=ResourceDelta)
    danger_feedback: DangerFeedback | None = None


class EndingCategory(BaseModel):
    """ending_classifier 군집 결과 (scenario-tree v2 §7).

    `ScenarioTree.ending_categories` dict 의 value 타입.
    key (`category_id`) 는 dict key 와 동일해야 한다 (불변 규약).
    """

    category_id: str
    label: str
    description: str
    node_ids: list[str]


class ScenarioNode(BaseModel):
    id: str
    type: Literal["narrative", "ending_good", "ending_bad"]
    text: str
    choices: list[Choice] = Field(default_factory=list)
    educational_content: EducationalContent | None = None
    image_url: str | None = None
    image_prompt: str | None = None
    depth: int = 0
    parent_node_id: str | None = None
    parent_choice_id: str | None = None
    # v2 신설 (scenario-tree v2 §2): ending 노드 한정으로 ending_category 부여.
    # narrative 노드는 항상 None. ending_classifier 미실행 시 ending 노드도 None.
    ending_category: str | None = None
