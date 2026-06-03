# ai-pipeline

Safe-or-Scam AI Pipeline. 실제 피싱 뉴스 기반 분기형 시나리오를 자동 생성한다.

## 스택

- Python 3.12
- FastAPI + uvicorn (port **8001**)
- LLM: OpenAI API (LiteLLM)
- 이미지/임베딩: OpenAI API
- 패키지 매니저: **uv**

## 역할

1. **뉴스 크롤링** — Google News RSS에서 최신 피싱 기사 수집, LLM이 사기 유형/수법/경고 신호 추출
2. **시나리오 트리 생성** — BFS로 depth 5까지, 각 노드 3개 선택지, 약 270개 노드의 분기형 트리 생성
3. **이미지 생성** — 모든 노드의 webtoon 스타일 장면 이미지 일괄 생성
4. **결과 적재** — MongoDB `scenarios` 컬렉션에 저장 (예정) 또는 로컬 JSON 출력

## 환경변수

`.env` 파일(`.env.example` 참고):

| 변수 | 필수 | 용도 |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | OpenAI API 호출용 |
| `LLM_MODEL` | (기본값 있음) | LiteLLM 모델 식별자 |
| `IMAGE_MODEL` | (기본값 있음) | OpenAI 이미지 모델 식별자 |
| `EMBEDDING_MODEL` | (기본값 있음) | 엔딩 클러스터링용 OpenAI 임베딩 모델 |
| `MAX_DEPTH` | (기본 5) | 시나리오 트리 최대 깊이 |
| `MAX_CHOICES` | (기본 3) | 노드당 최대 선택지 수 |

## 실행

```bash
cd apps/ai-pipeline

# 의존성 설치
uv sync

# 환경변수 설정
cp .env.example .env
# .env 편집 (OPENAI_API_KEY 등 채우기)

# 서버 기동
uv run uvicorn app.main:app --port 8001 --reload
```

## 주요 엔드포인트 (예정)

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/health` | 헬스체크 |
| `POST` | `/api/v1/crawler/refresh` | 뉴스 크롤링 새로고침 |
| `GET` | `/api/v1/crawler/articles` | 분석된 기사 조회 |
| `POST` | `/api/v1/crawler/generate-from-article` | 선택한 기사 기반 시나리오 생성 |
| `POST` | `/api/v1/scenarios/generate` | 시나리오 생성 (직접) |
| `GET` | `/api/v1/scenarios/{task_id}/status` | 생성 작업 상태 조회 |
