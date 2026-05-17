"""시나리오 관련 Pydantic 모델"""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class Resources(BaseModel):
    """게임 자원 상태 (절대값)"""
    trust: int = Field(default=3, ge=0, le=5)      # 사기범 신뢰도
    money: int = Field(default=3, ge=0, le=5)      # 금전적 자원
    awareness: int = Field(default=1, ge=0, le=5)  # 피싱 경각심


class ResourceDelta(BaseModel):
    """선택지의 자원 변동값 (상대값)"""
    trust: int = Field(default=0, ge=-2, le=2)
    money: int = Field(default=0, ge=-2, le=2)
    awareness: int = Field(default=0, ge=-2, le=2)


class ProtagonistProfile(BaseModel):
    """주인공 프로필"""
    age_group: Literal["young adult", "middle-aged", "elderly"]
    gender: Literal["man", "woman"]
    description: str  # 영문 한 줄 설명
    appearance: str   # 외모 디테일


class EducationalContent(BaseModel):
    """교육 콘텐츠"""
    title: str
    explanation: str
    prevention_tips: list[str]
    warning_signs: list[str]


class DangerFeedback(BaseModel):
    """위험한 선택에 대한 교육적 피드백"""
    why_dangerous: str          # 왜 위험한지 설명
    warning_signs: list[str]    # 놓친 경고 신호들
    safe_alternative: str       # 더 안전한 대안 설명


class Choice(BaseModel):
    """선택지"""
    id: str
    text: str
    next_node_id: str | None = None
    is_dangerous: bool = False
    resource_effect: ResourceDelta = Field(default_factory=ResourceDelta)
    danger_feedback: DangerFeedback | None = None  # 위험 선택 피드백


class ScenarioNode(BaseModel):
    """시나리오 노드"""
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


class ScenarioTree(BaseModel):
    """시나리오 트리 전체 구조"""
    id: str
    title: str
    description: str
    phishing_type: str
    difficulty: Literal["easy", "medium", "hard"]
    root_node_id: str
    nodes: dict[str, ScenarioNode]
    protagonist: ProtagonistProfile | None = None
    prologue: str | None = None  # 이전 상황 설명 (중간부터 시작)
    created_at: datetime
    metadata: dict = Field(default_factory=dict)
