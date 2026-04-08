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

    mongo_url: str
    mongo_db: str
    scenarios_dir: str | None = None


settings = Settings()  # type: ignore[call-arg]
