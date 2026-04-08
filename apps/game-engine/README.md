# game-engine

Safe-or-Scam 게임 엔진. FastAPI + MongoDB (beanie ODM).

## 스택

- Python 3.12
- FastAPI + uvicorn
- beanie (Pydantic v2 native, motor 기반 async MongoDB ODM)
- 패키지 매니저: **uv**

## MongoDB 컬렉션

4개 컬렉션 정의 (`app/models/`):

| 컬렉션 | 역할 |
|---|---|
| `scenarios` | 시나리오 트리 전체. ai-pipeline이 생성 후 적재 |
| `game_sessions` | 유저별 진행 중/완료된 플레이 세션 |
| `play_logs` | 완료된 플레이의 축약 기록 (경로, 점수, 엔딩 등) |
| `user_scenario_progress` | 유저별 시나리오 엔딩 수집 진행도 |

스키마 상세는 각 Document 파일 참고. 인덱스는 `init_beanie` 시점에 자동 생성.

## 환경변수

`.env` 파일(`.env.example` 참고):

| 변수 | 필수 | 용도 |
|---|---|---|
| `MONGO_URL` | **런타임 필수** | Mongo 연결 문자열 (예: `mongodb://root:root@localhost:27017` 또는 Atlas SRV URL) |
| `MONGO_DB` | **런타임 필수** | 데이터베이스 이름 (예: `safe_or_scam`) |
| `SCENARIOS_DIR` | **시드 시에만** | 시나리오 JSON 파일 디렉토리 절대경로. 런타임엔 불필요 |

### `infra/docker-compose.yml`과의 관계

`infra/docker-compose.yml`의 Mongo 컨테이너는 `MONGO_USERNAME`, `MONGO_PASSWORD`, `MONGO_DB` 환경변수를 사용해 컨테이너 자체를 부팅한다 (루트 계정 생성).

game-engine의 `MONGO_URL`은 **그 Mongo 컨테이너에 접속하기 위한 클라이언트 측 연결 문자열**이다. 로컬 개발 시 예시:

```bash
# infra/.env (컨테이너 부팅용 — 기존 값 그대로)
MONGO_USERNAME=sos_user
MONGO_PASSWORD=localpass123
MONGO_DB=sos_db

# apps/game-engine/.env (클라이언트 접속용)
MONGO_URL=mongodb://sos_user:localpass123@localhost:27017/?authSource=admin
MONGO_DB=sos_db
```

> `authSource=admin`이 필요한 이유: `infra/docker-compose.yml`이 `MONGO_INITDB_ROOT_USERNAME`으로 계정을 만들면, 이 계정은 `admin` 데이터베이스에 등록된다. 따라서 다른 DB(`sos_db`)에 접속할 때도 인증은 `admin`에서 수행해야 한다.

`MONGO_DB` 값은 양쪽에서 동일해야 한다.

Cloud Run + MongoDB Atlas 배포 시에는 `MONGO_URL`만 Atlas SRV 문자열로 교체.

## 개발 시작

```bash
# 1. Mongo 컨테이너 기동 (최초 1회)
cd ../../infra && docker compose up -d mongodb && cd -

# 2. 의존성 설치
uv sync

# 3. 환경변수 설정
cp .env.example .env
# .env 파일 열어서 MONGO_URL, MONGO_DB, (필요시) SCENARIOS_DIR 입력

# 4. FastAPI 기동
uv run uvicorn app.main:app --reload

# 5. health check
curl http://localhost:8000/health
```

## 시드 실행 (선택)

시나리오 JSON을 Mongo에 적재하고 예시 데이터를 넣는다.

**선행 조건**: `.env`의 `SCENARIOS_DIR`에 시나리오 JSON 디렉토리 절대경로 설정.

```bash
uv run python -m app.scripts.seed
```

동작:
- `{SCENARIOS_DIR}/scenario_*.json` 파일들을 `scenarios` 컬렉션에 upsert (idempotent)
- `id` → `scenario_id` 키 rename, `metadata` 제외
- `total_endings / total_good_endings / total_bad_endings` 파생 계산
- `tags=[]`, `updated_at=now`
- 예시 데이터 (user_id=1): 완료 플레이 2건(good/bad) + 진행 중 세션 1건 + progress 2건

여러 번 실행해도 안전하다.

## 시드 독립성

- 런타임 코드는 `app/scripts/seed.py`를 import하지 않는다.
- `SCENARIOS_DIR`는 시드 실행 시에만 필요, FastAPI 기동에는 불필요.
- 시드 스크립트 자체를 삭제해도 서비스는 정상 동작한다.
- ai-pipeline이 향후 `scenarios` 컬렉션에 직접 insert하는 구조로 전환해도 이 레포는 변경 불필요 (스키마 계약만 맞추면 됨).

## Cloud Run 배포 유의사항

- `PORT` 환경변수 자동 주입됨 → `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Mongo 연결은 lifespan startup에서 1회. Cold start 시 재연결됨.
- MongoDB Atlas 사용 권장 (자체 호스팅 대비 관리 부담 낮음)
