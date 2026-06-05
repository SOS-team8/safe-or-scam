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

    # JWT (auth-boundary v1 §7). backend (JJWT) 와 동일 secret 공유.
    # default 는 CI import smoke 통과용. 운영/dev 환경은 반드시 JWT_SECRET 환경변수로 override.
    jwt_secret: str = (
        "ci-smoke-default-secret-please-override-min-32-bytes-long-string"
    )
    
    # Internal API Key — backend ↔ game-engine 서비스 간 인증.
    # backend 와 동일 키 공유 (infra/.env). default 는 CI import smoke 통과용 —
    # 운영/dev 는 반드시 INTERNAL_API_KEY 환경변수로 override.
    internal_api_key: str = (
        "ci-smoke-default-internal-key-please-override-min-32-bytes-string"
    )


settings = Settings()  # type: ignore[call-arg]
