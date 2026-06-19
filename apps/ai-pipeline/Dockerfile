FROM python:3.12-slim
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# scripts/ 는 운영용(publish/delete)이라 API 런타임엔 불필요 → app 만 복사
COPY app ./app
RUN uv sync --frozen --no-dev

# non-root 사용자로 실행 (Cloud Run 보안 모범사례)
# data 디렉터리를 app 소유로 (앱이 news_cache·images 등을 쓸 수 있게)
RUN groupadd --system app && useradd --system --gid app app \
 && mkdir -p /app/app/data \
 && chown -R app:app /app/app/data
USER app

EXPOSE 8001
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
