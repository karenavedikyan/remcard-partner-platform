#!/usr/bin/env bash
# Reset CLIENT fixture + run M4-B browser 401→re-login acceptance (desktop + mobile).
# Each pass gets an independent DB reset and fresh one-time login codes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ARTIFACTS="${M4B_ARTIFACTS_DIR:-/opt/cursor/artifacts/m4b-browser-401}"
RESET_SQL="$ROOT/scripts/local/reset-m4b-client-onboarding.sql.example"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required (loopback remcard_prof_test only)." >&2
  echo "Example: export DATABASE_URL from your local navigator .env.local (do not commit)." >&2
  exit 1
fi

node "$ROOT/scripts/local/validate-test-database-url.mjs"

if ! curl -sf -o /dev/null "http://127.0.0.1:3000/login"; then
  echo "Partner dev server not reachable at http://127.0.0.1:3000" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required" >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx required" >&2
  exit 1
fi

generate_code() {
  printf '%06d' $(( (RANDOM * 32768 + RANDOM + $$) % 1000000 ))
}

mint_codes() {
  local initial relogin
  initial="$(generate_code)"
  relogin="$(generate_code)"
  while [[ "$initial" == "$relogin" ]]; do
    relogin="$(generate_code)"
  done
  M4B_INITIAL_CODE="$initial"
  M4B_RELOGIN_CODE="$relogin"
  export M4B_INITIAL_CODE M4B_RELOGIN_CODE
}

reset_fixture() {
  echo "Resetting CLIENT fixture (fresh onboarding + login codes)..."
  psql "$DATABASE_URL" \
    -v ON_ERROR_STOP=1 \
    -v initial_code="$M4B_INITIAL_CODE" \
    -v relogin_code="$M4B_RELOGIN_CODE" \
    -f "$RESET_SQL" >/dev/null
}

run_pass() {
  local label="$1"
  shift
  mint_codes
  reset_fixture
  echo "Running ${label} scenario..."
  node "$ROOT/scripts/local/m4b-browser-401-relogin.mjs" "$@"
}

# Playwright browsers (one-time install if missing)
npx --yes playwright install chromium >/dev/null 2>&1 || true

export M4B_ARTIFACTS_DIR="$ARTIFACTS"
mkdir -p "$ARTIFACTS/screenshots"

run_pass "desktop"
run_pass "mobile" --mobile

echo "Reports written to $ARTIFACTS"
