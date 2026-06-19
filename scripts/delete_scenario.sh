#!/usr/bin/env bash
# scripts/delete_scenario.sh <scenario_id> [--yes]
#
# 시나리오 전체 정리 — dev mongo doc + 로컬 PNG + 로컬 JSON + GCS prefix.
#
# 1) dev mongo `scenarios` 컬렉션에서 scenario_id 삭제
# 2) 로컬 디스크 PNG 디렉토리 + JSON 파일 삭제
# 3) GCS 의 gs://$GCS_BUCKET/<id>/ prefix 삭제 (없으면 skip)
#
# 인증: gsutil 은 ADC 자동 사용.
# 안전장치: 기본은 대화형 확인. CI / 스크립트에서 쓸 때만 --yes 로 강제 진행.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <scenario_id> [--yes]" >&2
  exit 1
fi
SCENARIO="$1"
SKIP_CONFIRM="${2:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/apps/ai-pipeline/.env"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

: "${GCS_BUCKET:?missing GCS_BUCKET in .env}"
: "${MONGODB_URL:?missing MONGODB_URL in .env}"

LOCAL_IMG_DIR="$ROOT/apps/ai-pipeline/app/data/images/$SCENARIO"
LOCAL_JSON="$ROOT/apps/ai-pipeline/app/data/scenarios/$SCENARIO.json"
GCS_PREFIX="gs://$GCS_BUCKET/$SCENARIO/"

echo "[delete_scenario] target=$SCENARIO"
echo "  - mongo  : scenarios.scenario_id='$SCENARIO'"
echo "  - local  : $LOCAL_IMG_DIR"
echo "             $LOCAL_JSON"
echo "  - GCS    : $GCS_PREFIX"

if [ "$SKIP_CONFIRM" != "--yes" ]; then
  read -r -p "정말로 모두 삭제할까요? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "취소"; exit 0; }
fi

echo "[1/3] mongo 삭제"
docker exec -i sos-mongo mongosh "$MONGODB_URL" --quiet --eval "
  const r = db.scenarios.deleteOne({scenario_id: '$SCENARIO'});
  print('  deleted_count=' + r.deletedCount);
"

echo "[2/3] 로컬 파일 삭제"
rm -rf "$LOCAL_IMG_DIR"
rm -f  "$LOCAL_JSON"
echo "  removed: $LOCAL_IMG_DIR, $LOCAL_JSON"

echo "[3/3] GCS 객체 삭제 (없으면 skip)"
if gsutil ls "$GCS_PREFIX" >/dev/null 2>&1; then
  gsutil -m rm -r "$GCS_PREFIX"
else
  echo "  GCS prefix 없음 — skip"
fi

echo "[delete_scenario] done: $SCENARIO"
