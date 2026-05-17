"""뉴스 크롤링 모듈 (RSS 기반)"""
import asyncio
import json
import re
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher
from urllib.parse import urlparse, urlunparse, quote
import httpx
import trafilatura
import litellm
import feedparser

from app.config import settings
from app.models.news import RawArticle, PhishingArticle

logger = logging.getLogger("core.news_crawler")
CACHE_DIR = Path(__file__).parent.parent / "data" / "news_cache"


class GoogleNewsClient:
    """Google News RSS 클라이언트 (API 키 불필요)"""
    BASE_URL = "https://news.google.com/rss/search"

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)

    def _clean_title(self, title: str) -> str:
        """제목에서 출처 정보 제거 (예: '제목 - 언론사' -> '제목')"""
        if " - " in title:
            return title.rsplit(" - ", 1)[0].strip()
        return title

    def _parse_date(self, date_str: str) -> datetime | None:
        """RSS 날짜 문자열 파싱"""
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(date_str)
        except Exception:
            return None

    async def search(
        self,
        keyword: str,
        display: int = 10
    ) -> list[RawArticle]:
        """Google News RSS로 뉴스 검색"""
        try:
            encoded_keyword = quote(keyword)
            url = f"{self.BASE_URL}?q={encoded_keyword}&hl=ko&gl=KR&ceid=KR:ko"

            response = await self.client.get(url)
            response.raise_for_status()

            feed = feedparser.parse(response.text)

            articles = []
            for entry in feed.entries[:display]:
                # 출처 정보 추출
                source = "google"
                if hasattr(entry, "source") and hasattr(entry.source, "title"):
                    source = entry.source.title

                articles.append(
                    RawArticle(
                        title=self._clean_title(entry.title),
                        url=entry.link,
                        description=entry.get("summary", "")[:500],
                        pub_date=entry.get("published", ""),
                        source=source,
                    )
                )

            logger.info("Google News 검색 완료: keyword=%s, results=%d", keyword, len(articles))
            return articles

        except Exception as e:
            logger.error("Google News 검색 실패: %s", str(e))
            return []

    async def close(self):
        await self.client.aclose()


class ArticleBodyExtractor:
    """개별 뉴스 사이트에서 기사 본문 추출"""

    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            follow_redirects=True,
        )

    async def extract(self, url: str) -> str | None:
        """URL에서 기사 본문 추출"""
        try:
            response = await self.client.get(url)
            body = trafilatura.extract(response.text)
            if body and len(body) > 100:
                return body[:3000]
            return None
        except Exception:
            return None

    async def close(self):
        await self.client.aclose()


def normalize_url(url: str) -> str:
    """URL 정규화 (쿼리 파라미터 제거)"""
    parsed = urlparse(url)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))


def is_duplicate(article: RawArticle, existing: list[RawArticle]) -> bool:
    """중복 기사 확인"""
    normalized = normalize_url(article.url)
    for ex in existing:
        # URL 비교
        if normalize_url(ex.url) == normalized:
            return True
        # 제목 유사도 비교
        ratio = SequenceMatcher(None, article.title, ex.title).ratio()
        if ratio >= 0.8:
            return True
    return False


class NewsCrawler:
    """뉴스 크롤링 오케스트레이터 (RSS 기반)"""

    # 피싱/사기 관련 뉴스 검색 키워드
    DEFAULT_KEYWORDS = [
        "신종사기",
        "신종피싱",
    ]

    def __init__(self):
        """RSS 기반 크롤러 초기화"""
        self.google_client = GoogleNewsClient()
        self.body_extractor = ArticleBodyExtractor()

    async def crawl(
        self,
        keywords: list[str] | None = None,
        max_per_keyword: int = 100,
        limit: int = 20
    ) -> list[RawArticle]:
        """키워드로 뉴스 크롤링 (RSS 기반)

        Args:
            keywords: 검색 키워드 목록
            max_per_keyword: 키워드당 최대 기사 수
            limit: 최종 반환할 기사 수 (최신순)

        Returns:
            최신순 정렬된 기사 목록 (중복 제거됨)
        """
        keywords = keywords or self.DEFAULT_KEYWORDS
        articles: list[RawArticle] = []

        for keyword in keywords:
            results = await self.google_client.search(keyword, display=max_per_keyword)

            for article in results:
                if not is_duplicate(article, articles):
                    articles.append(article)

            await asyncio.sleep(1)  # 레이트 리밋 방지

        # 최신순 정렬
        articles = self._sort_by_date(articles)

        logger.info("크롤링 완료: %d개 기사 (중복 제거, 최신순)", len(articles))

        # 상위 limit개만 본문 크롤링 (효율성)
        articles = articles[:limit]
        articles = await self._fetch_bodies(articles)

        return articles

    def _sort_by_date(self, articles: list[RawArticle]) -> list[RawArticle]:
        """기사를 최신순으로 정렬"""
        def parse_date(article: RawArticle) -> datetime:
            try:
                from email.utils import parsedate_to_datetime
                if article.pub_date:
                    return parsedate_to_datetime(article.pub_date)
            except Exception:
                pass
            return datetime.min.replace(tzinfo=timezone.utc)

        return sorted(articles, key=parse_date, reverse=True)

    async def _fetch_bodies(
        self,
        articles: list[RawArticle]
    ) -> list[RawArticle]:
        """기사 본문 추출"""
        for article in articles:
            body = await self.body_extractor.extract(article.url)
            article.body = body
            await asyncio.sleep(1)  # 본문 크롤링 간격
        return articles

    async def close(self):
        await self.google_client.close()
        await self.body_extractor.close()


async def analyze_article(article: RawArticle) -> PhishingArticle | None:
    """LLM으로 기사 내용 분석 및 피싱 관련 여부 필터링

    피싱/사기 관련 기사만 반환하고, 관련 없는 기사는 None 반환
    """
    content = article.body or article.description

    if not content or len(content) < 50:
        return None

    prompt = f"""당신은 피싱/사기를 예방하기 위해, 실제 피해사례를 사용하여 시나리오를 만든 뒤, 해당 시나리오를 사람들께 알림으로써 예방을 하도록 하는 **시나리오 제작자** 입니다.
    다음 뉴스 기사를 분석하여 **피싱/사기 시나리오 생성**에 활용할 정보를 추출하세요.

기사 제목: {article.title}
기사 내용: {content[:2000]}

## 분류 기준
관련 기사로 분류:
- 실제 피싱/사기 피해 사건 (피해자, 피해액, 수법 등)
- 검거/적발 사건 (범인의 구체적인 수법)
- 새로운 사기 수법 소개

제외:
- 예방 캠페인, 홍보, 정책 발표, 대책 마련
- 예방 시설 설치 뉴스
- '사기'라는 단어만 포함된 무관한 기사

## JSON 형식으로 응답
{{
  "is_phishing_related": true/false,
  "phishing_type": "사기 유형 (자유롭게 작성, 예: 검찰사칭 보이스피싱, 택배사칭 스미싱, 코인투자사기 등)",
  "victim_profile": "피해자 특성 (나이대, 직업, 상황 등)",
  "scammer_persona": "사기범 역할/사칭 대상 (검찰, 은행, 택배기사, 연인 등)",
  "initial_contact": "최초 접근 방식 (전화, 문자, SNS DM, 앱 등)",
  "persuasion_tactics": ["설득/협박 수법1", "수법2", "수법3"],
  "requested_actions": ["피해자에게 요구한 행동1", "행동2"],
  "red_flags": ["이 사기의 경고 신호1", "신호2"],
  "damage_amount": "피해 금액",
  "scenario_seed": "이 사례를 바탕으로 시나리오를 만들 때 활용할 핵심 스토리라인 (3-4문장)"
}}"""

    for attempt in range(settings.retry_count + 1):
        try:
            response = await litellm.acompletion(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": "뉴스 기사를 분석하여 피싱/사기 관련 여부를 판단하고 정보를 JSON으로 추출하세요."},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                timeout=settings.llm_timeout,
                api_key=settings.gemini_api_key,
            )

            data = json.loads(response.choices[0].message.content)

            # 피싱 관련 기사가 아니면 None 반환
            if not data.get("is_phishing_related", False):
                logger.debug("피싱 무관 기사 제외: %s", article.title)
                return None

            return PhishingArticle(
                url=article.url,
                title=article.title,
                source=article.source,
                published_at=None,
                body=article.body,
                phishing_type=data.get("phishing_type", "기타"),
                victim_profile=data.get("victim_profile"),
                scammer_persona=data.get("scammer_persona"),
                initial_contact=data.get("initial_contact"),
                persuasion_tactics=data.get("persuasion_tactics", []),
                requested_actions=data.get("requested_actions", []),
                red_flags=data.get("red_flags", []),
                damage_amount=data.get("damage_amount"),
                scenario_seed=data.get("scenario_seed"),
            )

        except Exception as e:
            logger.warning("기사 분석 실패 (시도 %d): %s", attempt + 1, str(e))
            if attempt == settings.retry_count:
                return None
            await asyncio.sleep(1)

    return None


async def crawl_and_analyze(
    keywords: list[str] | None = None
) -> list[PhishingArticle]:
    """크롤링 + 분석 전체 파이프라인"""
    crawler = NewsCrawler()

    try:
        # 1. 크롤링
        raw_articles = await crawler.crawl(keywords)

        # 2. 병렬 분석 (세마포어로 동시 호출 제한)
        semaphore = asyncio.Semaphore(5)

        async def analyze_with_limit(article: RawArticle):
            async with semaphore:
                return await analyze_article(article)

        results = await asyncio.gather(
            *[analyze_with_limit(a) for a in raw_articles],
            return_exceptions=True
        )

        # 성공한 결과만 필터링
        analyzed = [r for r in results if isinstance(r, PhishingArticle)]

        return analyzed

    finally:
        await crawler.close()


def group_by_phishing_type(
    articles: list[PhishingArticle]
) -> dict[str, list[PhishingArticle]]:
    """피싱 유형별 그룹핑"""
    grouped: dict[str, list[PhishingArticle]] = {}
    for article in articles:
        ptype = article.phishing_type
        if ptype not in grouped:
            grouped[ptype] = []
        grouped[ptype].append(article)
    return grouped


def format_articles_as_seed(articles: list[PhishingArticle]) -> str:
    """분석된 기사들을 시드 정보로 포맷"""
    lines = []
    for i, article in enumerate(articles[:5], 1):
        lines.append(f"{i}. {article.title}")
        lines.append(f"   유형: {article.phishing_type}")
        if article.persuasion_tactics:
            lines.append(f"   수법: {', '.join(article.persuasion_tactics)}")
        if article.damage_amount:
            lines.append(f"   피해액: {article.damage_amount}")
        if article.scenario_seed:
            lines.append(f"   시나리오: {article.scenario_seed}")
        lines.append("")
    return "\n".join(lines)


async def main():
    """테스트용 메인 함수 - 크롤링 결과 출력"""
    import sys

    # 로깅 설정
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )

    print("=" * 60)
    print("뉴스 크롤링 시작 (RSS 기반)")
    print("=" * 60)

    # 크롤링 + 분석
    articles = await crawl_and_analyze()

    if not articles:
        print("\n분석된 피싱 관련 기사가 없습니다.")
        return

    print(f"\n총 {len(articles)}개의 피싱 관련 기사를 찾았습니다.\n")
    print("=" * 60)

    for i, article in enumerate(articles, 1):
        print(f"\n[{i}] {article.title}")
        print(f"    유형: {article.phishing_type}")
        print(f"    출처: {article.source}")
        if article.victim_profile:
            print(f"    피해자: {article.victim_profile}")
        if article.scammer_persona:
            print(f"    사칭대상: {article.scammer_persona}")
        if article.initial_contact:
            print(f"    접근방식: {article.initial_contact}")
        if article.persuasion_tactics:
            print(f"    수법: {', '.join(article.persuasion_tactics)}")
        if article.requested_actions:
            print(f"    요구행동: {', '.join(article.requested_actions)}")
        if article.red_flags:
            print(f"    경고신호: {', '.join(article.red_flags)}")
        if article.damage_amount:
            print(f"    피해액: {article.damage_amount}")
        if article.scenario_seed:
            print(f"    시나리오: {article.scenario_seed}")
        print("-" * 60)

    # 유형별 그룹핑 결과
    grouped = group_by_phishing_type(articles)
    print(f"\n유형별 분류:")
    for ptype, arts in grouped.items():
        print(f"  - {ptype}: {len(arts)}건")


if __name__ == "__main__":
    asyncio.run(main())
