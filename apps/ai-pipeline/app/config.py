"""애플리케이션 설정"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# 패키지 루트(app/) — 어떤 CWD에서 ai-pipeline 을 띄워도 동일한 절대 경로를 잡기 위한 기준점.
_APP_DIR = Path(__file__).resolve().parent
_DEFAULT_IMAGES_DIR = str(_APP_DIR / "data" / "images")


class Settings(BaseSettings):
    """환경변수 기반 설정"""
    # OpenAI API (LLM + 이미지 생성 + 임베딩)
    openai_api_key: str = ""
    llm_model: str = "gpt-5.4-mini"
    image_model: str = "gpt-image-2"
    embedding_model: str = "text-embedding-3-small"

    # GCS 호스팅 (#53).
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

    # 이미지 생성 설정 (OpenAI Image API)
    image_max_concurrent: int = 5   # 병렬 처리 수 (5개 동시)
    image_retry_count: int = 2      # 재시도 횟수
    image_retry_delay: float = 2.0  # 재시도 간격 (초)
    image_batch_size: int = 10      # 배치 크기
    image_batch_wait: float = 12.0  # 배치 간 대기 (초)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
