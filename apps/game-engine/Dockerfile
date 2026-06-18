FROM python:3.12-slim
WORKDIR /app

# uv (공식 이미지에서 바이너리만 가져옴)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

# 의존성 먼저 설치 (캐싱 레이어, 프로젝트 자체는 제외)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# 앱 코드 + 프로젝트 설치
COPY app ./app
RUN uv sync --frozen --no-dev

# non-root 사용자로 실행 (Cloud Run 보안 모범사례)
RUN groupadd --system app && useradd --system --gid app app
USER app

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
