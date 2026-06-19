#!/usr/bin/env bash
# scripts/publish_scenario.sh <scenario_id>
#
# 로컬 dev 에서 만든 시나리오를 GCS 로 publish 한다.
#
# 1) gsutil rsync 으로 apps/ai-pipeline/app/data/images/<id>/  →  gs://$GCS_BUCKET/<id>/
#    (idempotent — 이미 올라간 파일은 건너뜀, 중간 실패 후 재호출해도 안전)
# 2) dev mongo 의 시나리오 image_url 들을 GCS URL 로 일괄 교체
#    (/api/v1/images/<id>/ → https://storage.googleapis.com/$GCS_BUCKET/<id>/)
#
# 인증: gsutil 은 ADC (gcloud auth application-default login) 자동 사용.
# 순서: GCS 먼저 → mongo 나중. 중간 실패해도 같은 명령 재실행으로 idempotent 복구.
#
# 사용 전 docker 가 띄워져 있어야 함 (mongo 접근). 보통 ./scripts/dev.sh up 후 실행.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <scenario_id>" >&2
  exit 1
fi
SCENARIO="$1"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/apps/ai-pipeline/.env"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

: "${GCS_BUCKET:?missing GCS_BUCKET in .env}"
: "${MONGODB_URL:?missing MONGODB_URL in .env}"
: "${MONGODB_DB:?missing MONGODB_DB in .env}"

LOCAL_DIR="$ROOT/apps/ai-pipeline/app/data/images/$SCENARIO"
if [ ! -d "$LOCAL_DIR" ]; then
  echo "no local images: $LOCAL_DIR" >&2
  exit 1
fi

NUM_FILES=$(find "$LOCAL_DIR" -type f -name "*.png" | wc -l | tr -d ' ')
echo "[publish_scenario] target=$SCENARIO  files=$NUM_FILES  bucket=$GCS_BUCKET"

echo "[1/2] gsutil rsync  $LOCAL_DIR/  →  gs://$GCS_BUCKET/$SCENARIO/"
gsutil -m rsync -r "$LOCAL_DIR/" "gs://$GCS_BUCKET/$SCENARIO/"

echo "[2/2] mongo image_url 교체 in scenario_id=$SCENARIO"
docker exec -i sos-mongo mongosh "$MONGODB_URL" --quiet --eval "
  const id = '$SCENARIO';
  const bucket = '$GCS_BUCKET';
  const database = db.getSiblingDB('$MONGODB_DB');
  const oldPrefix = '/api/v1/images/' + id + '/';
  const newPrefix = 'https://storage.googleapis.com/' + bucket + '/' + id + '/';
  const d = database.scenarios.findOne({scenario_id: id});
  if (!d) { print('  scenario not found in mongo: ' + id); quit(1); }
  let changed = 0, alreadyGcs = 0;
  for (const [nid, node] of Object.entries(d.nodes)) {
    if (!node.image_url) continue;
    if (node.image_url.startsWith(oldPrefix)) {
      d.nodes[nid].image_url = newPrefix + node.image_url.slice(oldPrefix.length);
      changed++;
    } else if (node.image_url.startsWith(newPrefix)) {
      alreadyGcs++;
    }
  }
  database.scenarios.updateOne({scenario_id: id}, {\$set: {nodes: d.nodes}});
  print('  changed=' + changed + ', already_gcs=' + alreadyGcs);
"

echo "[publish_scenario] done: $SCENARIO"
