#!/usr/bin/env bash
# safe-or-scam 로컬 개발 환경 통합 스크립트
#
# Usage:
#   ./scripts/dev.sh up          모든 서비스 시작 (infra + backend + game-engine + ai-pipeline + frontend)
#   ./scripts/dev.sh down        모든 서비스 중지 + docker compose down
#   ./scripts/dev.sh restart     down + up
#   ./scripts/dev.sh status      각 서비스 PID·헬스 확인
#   ./scripts/dev.sh logs <svc>  서비스 로그 tail (backend | game-engine | ai-pipeline | frontend)
#
# 사전 조건: java(JDK 21), uv, node 20+, docker, npm 모두 PATH 에 있음.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs/dev"
PID_DIR="$LOG_DIR/pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

INFRA_COMPOSE="$ROOT/infra/docker-compose.yml"
INFRA_ENV="$ROOT/infra/.env"

# 색상
RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[0;33m'; CYA='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYA}[dev]${NC} $*"; }
ok()   { echo -e "${GRN}[ok]${NC} $*"; }
warn() { echo -e "${YEL}[warn]${NC} $*"; }
err()  { echo -e "${RED}[err]${NC} $*" >&2; }

load_env() {
  local file="$1"
  if [ -f "$file" ]; then
    set -a
    # shellcheck source=/dev/null
    source "$file"
    set +a
  fi
}

wait_for_url() {
  local url="$1" name="$2" timeout="${3:-60}"
  local i=0
  while [ "$i" -lt "$timeout" ]; do
    if curl -sf -o /dev/null --max-time 2 "$url" 2>/dev/null; then
      ok "$name ready ($url)"
      return 0
    fi
    sleep 1
    i=$((i+1))
  done
  warn "$name not ready after ${timeout}s ($url) — 로그 확인 권장"
  return 1
}

start_infra() {
  log "Starting docker infra..."
  if [ ! -f "$INFRA_ENV" ]; then
    err "missing $INFRA_ENV (POSTGRES_*, MONGO_*, JWT_SECRET 필수)"
    exit 1
  fi
  docker compose -f "$INFRA_COMPOSE" --env-file "$INFRA_ENV" up -d >/dev/null
  log "Waiting for postgres..."
  for _ in $(seq 1 30); do
    if docker exec sos-postgres pg_isready -U sos_user >/dev/null 2>&1; then
      ok "postgres ready"
      return 0
    fi
    sleep 1
  done
  err "postgres not ready"
  return 1
}

start_backend() {
  log "Starting backend (8080)..."
  ( cd "$ROOT/apps/backend"
    load_env "$INFRA_ENV"
    nohup ./gradlew bootRun --args='--spring.profiles.active=local' \
      > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$PID_DIR/backend.pid"
  )
  wait_for_url "http://localhost:8080/" "backend" 90 || true
}

start_game_engine() {
  log "Starting game-engine (8000)..."
  ( cd "$ROOT/apps/game-engine"
    load_env "$ROOT/apps/game-engine/.env"
    nohup uv run uvicorn app.main:app --port 8000 --reload \
      > "$LOG_DIR/game-engine.log" 2>&1 &
    echo $! > "$PID_DIR/game-engine.pid"
  )
  wait_for_url "http://localhost:8000/health" "game-engine" 30
}

start_ai_pipeline() {
  log "Starting ai-pipeline (8001)..."
  ( cd "$ROOT/apps/ai-pipeline"
    load_env "$ROOT/apps/ai-pipeline/.env"
    nohup uv run uvicorn app.main:app --port 8001 \
      > "$LOG_DIR/ai-pipeline.log" 2>&1 &
    echo $! > "$PID_DIR/ai-pipeline.pid"
  )
  wait_for_url "http://localhost:8001/health" "ai-pipeline" 30
}

start_frontend() {
  log "Starting frontend (5173)..."
  ( cd "$ROOT/apps/frontend"
    if [ ! -d node_modules ]; then
      log "node_modules 부재 → npm install"
      npm install >> "$LOG_DIR/frontend.log" 2>&1
    fi
    nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$PID_DIR/frontend.pid"
  )
  wait_for_url "http://localhost:5173/" "frontend" 30
}

stop_service() {
  local name="$1"
  local pidfile="$PID_DIR/$name.pid"
  if [ -f "$pidfile" ]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      log "Stopping $name (pid=$pid)..."
      kill "$pid" 2>/dev/null || true
      for _ in 1 2 3 4 5; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 1
      done
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pidfile"
  fi
}

stop_all_services() {
  for name in frontend ai-pipeline game-engine backend; do
    stop_service "$name"
  done
  # 자식 프로세스 누락 방지 (port 기반 정확 매칭)
  pkill -f "uvicorn app.main:app --port 8000" 2>/dev/null || true
  pkill -f "uvicorn app.main:app --port 8001" 2>/dev/null || true
  pkill -f "vite.*--port 5173|vite$" 2>/dev/null || true
  pkill -f "GradleDaemon\|gradlew bootRun" 2>/dev/null || true
  ok "app services stopped"
}

up_all() {
  start_infra
  start_backend &
  BACK_PID=$!
  start_game_engine &
  GE_PID=$!
  start_ai_pipeline &
  AI_PID=$!
  wait "$BACK_PID" "$GE_PID" "$AI_PID" || true
  start_frontend
  echo ""
  ok "ALL UP"
  cat <<EOF
  Frontend     http://localhost:5173
  Backend      http://localhost:8080
  Game Engine  http://localhost:8000/docs
  AI Pipeline  http://localhost:8001/docs
  Mailpit      http://localhost:8025

Logs dir : $LOG_DIR
Tail     : ./scripts/dev.sh logs <backend|game-engine|ai-pipeline|frontend>
Stop     : ./scripts/dev.sh down
EOF
}

down_all() {
  stop_all_services
  log "Stopping docker infra..."
  docker compose -f "$INFRA_COMPOSE" --env-file "$INFRA_ENV" down >/dev/null || true
  ok "ALL DOWN"
}

show_status() {
  echo ""
  log "--- app services ---"
  for name in backend game-engine ai-pipeline frontend; do
    local pidfile="$PID_DIR/$name.pid"
    if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
      ok "$name running (pid=$(cat "$pidfile"))"
    else
      err "$name NOT running"
    fi
  done
  echo ""
  log "--- ports ---"
  for p in 5173 8000 8001 8080 8025 5432 27017 6379; do
    if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
      ok "port $p listening"
    else
      warn "port $p free"
    fi
  done
  echo ""
  log "--- docker compose ---"
  docker compose -f "$INFRA_COMPOSE" ps 2>/dev/null || true
}

show_logs() {
  local svc="${1:-}"
  case "$svc" in
    backend|game-engine|ai-pipeline|frontend) tail -f "$LOG_DIR/$svc.log" ;;
    *) err "Usage: ./scripts/dev.sh logs <backend|game-engine|ai-pipeline|frontend>"; exit 1 ;;
  esac
}

case "${1:-up}" in
  up)      up_all ;;
  down)    down_all ;;
  restart) down_all; sleep 2; up_all ;;
  status)  show_status ;;
  logs)    show_logs "${2:-}" ;;
  *)
    cat <<EOF >&2
Usage: $0 {up|down|restart|status|logs <service>}

Commands:
  up        모든 서비스 시작 (infra + backend + game-engine + ai-pipeline + frontend)
  down      모든 서비스 중지 + docker compose down
  restart   down + up
  status    각 서비스 PID + 포트 확인
  logs SVC  로그 tail (backend | game-engine | ai-pipeline | frontend)
EOF
    exit 1 ;;
esac
