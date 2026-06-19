#!/usr/bin/env bash
# safe-or-scam 로컬 개발 환경 통합 스크립트 (단순화 버전)
#
# 사용법:
#   ./scripts/dev.sh up          docker infra + 3개 앱 서비스 시작
#   ./scripts/dev.sh down        모두 중지 + docker compose down
#   ./scripts/dev.sh restart     down + up
#   ./scripts/dev.sh status      포트·PID 점검
#   ./scripts/dev.sh logs SVC    로그 tail (backend|game-engine|ai-pipeline|frontend)
#
# 사전 조건: java(JDK 21), uv, node 20+, docker, npm 모두 PATH 에 있음.
# 주의: set -e 미사용. 한 서비스 실패해도 나머지 계속 띄움.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/logs/dev"
PID_DIR="$LOG_DIR/pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

INFRA_COMPOSE="$ROOT/infra/docker-compose.yml"
INFRA_ENV="$ROOT/infra/.env"

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YEL=$'\033[0;33m'; CYA=$'\033[0;36m'; NC=$'\033[0m'
log()  { printf "${CYA}[dev]${NC} %s\n" "$*"; }
ok()   { printf "${GRN}[ok]${NC} %s\n" "$*"; }
warn() { printf "${YEL}[warn]${NC} %s\n" "$*"; }
err()  { printf "${RED}[err]${NC} %s\n" "$*" >&2; }

load_env() {
  local file="$1"
  [ -f "$file" ] || return 0
  set -a
  # shellcheck source=/dev/null
  source "$file"
  set +a
}

# 포트 점유 시 죽임 (set -e 해제 상태라 lsof 실패해도 무해)
ensure_port_free() {
  local port="$1"
  local pids
  pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null)
  if [ -n "$pids" ]; then
    warn "port $port busy (pids=$pids) — killing"
    echo "$pids" | xargs -I{} kill {} 2>/dev/null
    sleep 1
    pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$pids" ]; then
      echo "$pids" | xargs -I{} kill -9 {} 2>/dev/null
      sleep 1
    fi
  fi
}

# 어떤 HTTP 응답이든 ready로 인정 (401/404도 서버 살아있는 신호)
wait_for_url() {
  local url="$1" name="$2" timeout="${3:-60}"
  local i=0 code
  while [ "$i" -lt "$timeout" ]; do
    code=$(curl -s -o /dev/null --max-time 2 -w "%{http_code}" "$url" 2>/dev/null)
    if [ -n "$code" ] && [ "$code" != "000" ]; then
      ok "$name ready ($url, HTTP $code)"
      return 0
    fi
    sleep 1
    i=$((i+1))
  done
  warn "$name not ready after ${timeout}s — 로그: ./scripts/dev.sh logs $name"
  return 1
}

start_infra() {
  if [ ! -f "$INFRA_ENV" ]; then
    err "missing $INFRA_ENV (POSTGRES_*, MONGO_*, JWT_SECRET 등 필수)"
    return 1
  fi
  log "docker compose up (postgres, mongo, redis, mailpit, rabbitmq)..."
  docker compose -f "$INFRA_COMPOSE" --env-file "$INFRA_ENV" up -d >/dev/null
  log "Waiting for postgres..."
  local i=0
  while [ "$i" -lt 30 ]; do
    if docker exec sos-postgres pg_isready -U sos_user >/dev/null 2>&1; then
      ok "postgres ready"
      return 0
    fi
    sleep 1
    i=$((i+1))
  done
  warn "postgres not ready after 30s"
  return 1
}

start_backend() {
  ensure_port_free 8080
  log "Starting backend (8080)..."
  load_env "$INFRA_ENV"
  (
    cd "$ROOT/apps/backend" || exit 1
    nohup ./gradlew bootRun --args='--spring.profiles.active=local' \
      > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$PID_DIR/backend.pid"
  )
  # gradle 첫 부팅은 길다 (gradle daemon + spring + flyway). 충분히 대기.
  wait_for_url "http://localhost:8080/" "backend" 120
}

start_game_engine() {
  ensure_port_free 8000
  log "Starting game-engine (8000)..."
  load_env "$ROOT/apps/game-engine/.env"
  (
    cd "$ROOT/apps/game-engine" || exit 1
    nohup uv run uvicorn app.main:app --port 8000 --reload \
      > "$LOG_DIR/game-engine.log" 2>&1 &
    echo $! > "$PID_DIR/game-engine.pid"
  )
  wait_for_url "http://localhost:8000/health" "game-engine" 30
}

start_ai_pipeline() {
  ensure_port_free 8001
  log "Starting ai-pipeline (8001)..."
  load_env "$ROOT/apps/ai-pipeline/.env"
  (
    cd "$ROOT/apps/ai-pipeline" || exit 1
    nohup uv run uvicorn app.main:app --port 8001 \
      > "$LOG_DIR/ai-pipeline.log" 2>&1 &
    echo $! > "$PID_DIR/ai-pipeline.pid"
  )
  wait_for_url "http://localhost:8001/health" "ai-pipeline" 30
}

start_frontend() {
  ensure_port_free 5173
  log "Starting frontend (5173)..."
  (
    cd "$ROOT/apps/frontend" || exit 1
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
    pid=$(cat "$pidfile" 2>/dev/null)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      log "Stopping $name (pid=$pid)..."
      kill "$pid" 2>/dev/null
      local i=0
      while [ "$i" -lt 5 ]; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 1
        i=$((i+1))
      done
      kill -9 "$pid" 2>/dev/null
    fi
    rm -f "$pidfile"
  fi
}

stop_all_services() {
  for name in frontend ai-pipeline game-engine backend; do
    stop_service "$name"
  done
  # 자식 프로세스 누락 방지 (port 기반)
  pkill -f "uvicorn app.main:app --port 8000" 2>/dev/null
  pkill -f "uvicorn app.main:app --port 8001" 2>/dev/null
  pkill -f "vite$" 2>/dev/null
  pkill -f "gradlew bootRun" 2>/dev/null
  ok "app services stopped"
}

up_all() {
  start_infra || return 1
  start_backend
  start_game_engine
  start_ai_pipeline
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
  docker compose -f "$INFRA_COMPOSE" --env-file "$INFRA_ENV" down >/dev/null 2>&1
  ok "ALL DOWN"
}

show_status() {
  echo ""
  log "--- app services ---"
  for name in backend game-engine ai-pipeline frontend; do
    local pidfile="$PID_DIR/$name.pid"
    if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile" 2>/dev/null)" 2>/dev/null; then
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
  docker compose -f "$INFRA_COMPOSE" ps 2>/dev/null
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
EOF
    exit 1 ;;
esac
