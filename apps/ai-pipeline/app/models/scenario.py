"""시나리오 관련 Pydantic 모델 (scenario-tree contract v2).

- ScenarioTree.id → scenario_id 통일 (ADR-008).
- 기존 disk JSON (v1: `id` 필드)도 alias로 load 가능 (Backward compatibility).
- 직렬화 시 `scenario_id`만 출력 (game-engine과 컬렉션 필드명 일치).
- total_endings / total_good_endings / total_bad_endings / tags / updated_at 추가.
- EndingCategory 모델 신설, ScenarioNode.ending_category 신설 (ending_classifier 결과 저장).
- metadata 필드 제거.
"""
from datetime import datetime, timezone
from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


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
    """주인공 프로필 (영문 Literal enum; scenario-tree §6)."""
    age_group: Literal["young adult", "middle-aged", "elderly"]
    gender: Literal["man", "woman"]
    description: str  # 영문 한 줄 설명
    appearance: str   # 외모 디테일


class EducationalContent(BaseModel):
    """교육 콘텐츠 (객체; ADR-009)."""
    title: str
    explanation: str
    prevention_tips: list[str]
    warning_signs: list[str]


class DangerFeedback(BaseModel):
    """위험한 선택에 대한 교육적 피드백 (객체; ADR-009)."""
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
    """시나리오 노드.

    `ending_category`는 ending_classifier 실행 시 ending 노드에만 채워진다.
    narrative 노드 / 미분류 ending 노드는 None.
    """

    model_config = ConfigDict(extra="ignore")

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
    ending_category: str | None = None  # v2 신설 (scenario-tree §2)


class EndingCategory(BaseModel):
    """엔딩 카테고리 (ending_classifier 결과; scenario-tree §7).

    `ScenarioTree.ending_categories` dict의 value 타입.
    """
    category_id: str
    label: str
    description: str
    node_ids: list[str]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ScenarioTree(BaseModel):
    """시나리오 트리 전체 구조 (scenario-tree contract v2 §1).

    - `scenario_id`는 v1의 `id` 필드와 alias 호환 (기존 disk JSON 로드 가능).
    - 직렬화 시 `scenario_id`만 출력 → game-engine `Scenario` Document 필드명과 일치.
    - `metadata` 필드는 v2에서 제거 (game-engine Document에 부재).
    """

    # extra=ignore: 기존 v1 JSON에 `metadata` 등 잔존 필드 있어도 무시
    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
    )

    scenario_id: str = Field(
        validation_alias=AliasChoices("scenario_id", "id"),
        serialization_alias="scenario_id",
    )
    title: str
    description: str
    phishing_type: str
    difficulty: Literal["easy", "medium", "hard"]
    root_node_id: str
    nodes: dict[str, ScenarioNode]
    protagonist: ProtagonistProfile | None = None
    prologue: str | None = None  # 이전 상황 설명 (중간부터 시작)

    # 파생 필드 (ai-pipeline tree_builder가 tree 완성 시 계산하여 set)
    total_endings: int = Field(default=0, ge=0)
    total_good_endings: int = Field(default=0, ge=0)
    total_bad_endings: int = Field(default=0, ge=0)

    tags: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime = Field(default_factory=_utcnow)

    # ending_classifier 결과 (실행 안 했으면 None)
    ending_categories: dict[str, EndingCategory] | None = None


def compute_ending_counts(tree: ScenarioTree) -> tuple[int, int, int]:
    """tree.nodes 기반 (total_endings, total_good_endings, total_bad_endings) 계산.

    scenario-tree §8-#7 — ai-pipeline upsert 직전에 set.
    """
    good = sum(1 for n in tree.nodes.values() if n.type == "ending_good")
    bad = sum(1 for n in tree.nodes.values() if n.type == "ending_bad")
    return good + bad, good, bad
