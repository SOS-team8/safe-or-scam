"""뉴스 관련 Pydantic 모델"""
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field


class RawArticle(BaseModel):
    """크롤링된 원본 기사"""
    title: str
    url: str
    description: str
    pub_date: str
    source: str
    body: str | None = None


class PhishingArticle(BaseModel):
    """LLM 분석된 피싱 기사 (시나리오 생성용)"""
    id: str = Field(default_factory=lambda: uuid4().hex[:8])
    url: str
    title: str
    source: str
    published_at: datetime | None = None
    body: str | None = None  # 원본 본문

    # 시나리오 생성용 분석 정보
    phishing_type: str  # 사기 유형 (자유 형식)
    victim_profile: str | None = None  # 피해자 특성
    scammer_persona: str | None = None  # 사기범 역할/사칭 대상
    initial_contact: str | None = None  # 최초 접근 방식
    persuasion_tactics: list[str] = []  # 설득/협박 수법
    requested_actions: list[str] = []  # 피해자에게 요구한 행동
    red_flags: list[str] = []  # 경고 신호
    damage_amount: str | None = None  # 피해 금액
    scenario_seed: str | None = None  # 시나리오 스토리라인
