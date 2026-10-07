#!/usr/bin/env bash
# Reset CLIENT fixture + run M4-B browser 401→re-login acceptance (desktop + mobile).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

DATABASE_URL="${DATABASE_URL:-postgresql://remcard_test:5fde6049a1b90b107c27a5c7@127.0.0.1:5432/remcard_prof_test}"
INITIAL_CODE="${M4B_INITIAL_CODE:-901001}"
RELOGIN_CODE="${M4B_RELOGIN_CODE:-901002}"
ARTIFACTS="${M4B_ARTIFACTS_DIR:-/opt/cursor/artifacts/m4b-browser-401}"

if ! curl -sf -o /dev/null "http://127.0.0.1:3000/login"; then
  echo "Partner dev server not reachable at http://127.0.0.1:3000" >&2
  exit 1
fi

echo "Resetting CLIENT fixture and minting login codes..."
psql "$DATABASE_URL" \
  -v initial_code="$INITIAL_CODE" \
  -v relogin_code="$RELOGIN_CODE" \
  -f "$ROOT/scripts/local/reset-m4b-client-onboarding.sql.example"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx required" >&2
  exit 1
fi

# Playwright browsers (one-time install if missing)
npx --yes playwright install chromium >/dev/null 2>&1 || true

export M4B_INITIAL_CODE="$INITIAL_CODE"
export M4B_RELOGIN_CODE="$RELOGIN_CODE"
export M4B_ARTIFACTS_DIR="$ARTIFACTS"

mkdir -p "$ARTIFACTS/screenshots"

echo "Running desktop scenario..."
node "$ROOT/scripts/local/m4b-browser-401-relogin.mjs"

echo "Running mobile scenario..."
node "$ROOT/scripts/local/m4b-browser-401-relogin.mjs" --mobile

echo "Reports written to $ARTIFACTS"
