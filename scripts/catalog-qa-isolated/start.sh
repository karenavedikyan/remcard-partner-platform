#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
mkdir -p "$CATALOG_QA_RUN" "$CATALOG_QA_LOG"
PID_FILE="$CATALOG_QA_RUN/frontend.pid"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "[start] frontend already running pid=$(cat "$PID_FILE")"
  exit 0
fi

cd "$REPO_ROOT"
catalog_qa_frontend_env
echo "[start] pnpm run build"
pnpm run build

echo "[start] next start -p $CATALOG_QA_FRONTEND_PORT"
env -i \
  HOME="${HOME}" \
  PATH="${PATH}" \
  NODE_ENV=production \
  PORT="$CATALOG_QA_FRONTEND_PORT" \
  REMCARD_API_BASE_URL="$REMCARD_API_BASE_URL" \
  NEXT_PUBLIC_BASE_URL="$NEXT_PUBLIC_BASE_URL" \
  pnpm exec next start -p "$CATALOG_QA_FRONTEND_PORT" >>"$CATALOG_QA_LOG/frontend.log" 2>&1 &
echo $! >"$PID_FILE"
sleep 8
curl -sf "http://127.0.0.1:${CATALOG_QA_FRONTEND_PORT}/" >/dev/null
echo "[start] frontend OK pid=$(cat "$PID_FILE")"
