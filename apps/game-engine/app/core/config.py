"""애플리케이션 설정 — pydantic-settings 기반"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """환경변수 설정.

    런타임 필수: MONGO_URL, MONGO_DB
    시드 전용 (Optional): SCENARIOS_DIR — FastAPI 기동에는 불필요,
      시드 스크립트가 직접 None 체크 후 에러.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # CI import smoke 통과용 default. 실제 런타임은 .env로 반드시 override.
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "safe_or_scam"
    scenarios_dir: str | None = None


settings = Settings()  # type: ignore[call-arg]
