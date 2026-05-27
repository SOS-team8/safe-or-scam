"""애플리케이션 설정"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# 패키지 루트(app/) — 어떤 CWD에서 ai-pipeline 을 띄워도 동일한 절대 경로를 잡기 위한 기준점.
_APP_DIR = Path(__file__).resolve().parent
_DEFAULT_IMAGES_DIR = str(_APP_DIR / "data" / "images")


class Settings(BaseSettings):
    """환경변수 기반 설정"""
    # Google Gemini API (LLM + 이미지 생성용)
    gemini_api_key: str = ""
    llm_model: str = "gemini/gemini-3.1-flash-lite"
    # 이미지 생성 — Nano Banana 2 (#53). Imagen 4 family 2026-06 EOL 이후 forward path.
    image_model: str = "gemini-3.1-flash-image-preview"

    # GCS 호스팅 + (옵션) Vertex AI (#53).
    # 인증은 ADC 우선 — `google_application_credentials` 가 빈 값이면 키 파일 설정
    # 분기를 skip 하고 google SDK 가 자동 ADC 잡는다 (`gcloud auth application-default login`).
    google_application_credentials: str = ""
    gcp_project_id: str = ""
    # us-central1 — gemini-3.1-flash-image-preview 표준 지원 region. 다른 region
    # 은 preview 모델이 풀려있지 않을 수 있다.
    gcp_location: str = "us-central1"
    # publish_scenario.sh / delete_scenario.sh 가 사용. 파이썬 코드에서는 미참조이지만
    # config 에 노출해두어 settings.gcs_bucket 으로 정합성 확인 가능.
    gcs_bucket: str = ""

    # 서버 설정
    backend_port: int = 8001
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # 프로덕션 모드
    is_production: bool = False

    # 백그라운드 작업 제한
    max_concurrent_tasks: int = 1

    # 시나리오 이미지 정적 서빙 경로 (StaticFiles로 마운트).
    # MongoDB scenarios.nodes[*].image_url 은 "/api/v1/images/..." 상대 경로이며
    # 본 디렉토리 하위에 scenario_xxx/node_xxx.png 형태로 저장됨.
    # 기본값은 패키지 상대 경로(apps/ai-pipeline/app/data/images)로 계산되어 어떤
    # 작업 디렉토리에서 ai-pipeline 을 띄워도 image_generator 저장 위치와 mount
    # 위치가 항상 일치한다 (#51). env 의 IMAGES_DIR 가 있으면 그쪽 우선.
    images_dir: str = _DEFAULT_IMAGES_DIR

    # 관리자 인증
    admin_password: str = ""

    # MongoDB (game-engine과 공유; news-article / scenario-tree contract)
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "safe_or_scam"

    # 파이프라인 설정
    max_depth: int = 5
    max_choices: int = 3
    semaphore_limit: int = 5
    retry_count: int = 2
    llm_timeout: int = 60
    pipeline_timeout: int = 3000

    # 이미지 생성 설정 (Nano Banana 2 / Gemini 3.1 Flash Image — IPM 은 AI Studio
    # dashboard 에서 프로젝트별 확인. preview 모델이라 보수적으로 시작 권장.)
    image_max_concurrent: int = 5   # 병렬 처리 수 (5개 동시)
    image_retry_count: int = 2      # 재시도 횟수
    image_retry_delay: float = 2.0  # 재시도 간격 (초)
    image_batch_size: int = 10      # 배치 크기
    image_batch_wait: float = 12.0  # 배치 간 대기 (초)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
