"""애플리케이션 설정"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """환경변수 기반 설정"""
    # Google Gemini API (LLM용)
    gemini_api_key: str = ""
    llm_model: str = "gemini/gemini-3.1-flash-lite"
    image_model: str = "imagen-4.0-fast-generate-001"

    # Google Cloud Vertex AI (Imagen 이미지 생성용)
    google_application_credentials: str = ""
    gcp_project_id: str = ""
    gcp_location: str = "us-central1"

    # 서버 설정
    backend_port: int = 8001
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # 프로덕션 모드
    is_production: bool = False

    # 백그라운드 작업 제한
    max_concurrent_tasks: int = 1

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

    # 이미지 생성 설정 (Imagen 4.0 Fast: 분당 150 요청 제한)
    image_max_concurrent: int = 5   # 병렬 처리 수 (5개 동시)
    image_retry_count: int = 2      # 재시도 횟수
    image_retry_delay: float = 2.0  # 재시도 간격 (초)
    image_batch_size: int = 10      # 배치 크기
    image_batch_wait: float = 12.0  # 배치 간 대기 (초)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
