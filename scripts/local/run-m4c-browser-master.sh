#!/usr/bin/env bash
# PROF-C scenario A: MASTER onboarding browser acceptance (desktop 1440 + mobile 390).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ARTIFACTS="${M4C_ARTIFACTS_DIR:-/opt/cursor/artifacts/m4c-browser-master}"
RESET_SQL="$ROOT/scripts/local/reset-m4b-client-onboarding.sql.example"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required (loopback remcard_prof_test only)." >&2
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

generate_code() {
  printf '%06d' $(( (RANDOM * 32768 + RANDOM + $$) % 1000000 ))
}

reset_fixture() {
  local code="$1"
  local relogin
  relogin="$(generate_code)"
  while [[ "$code" == "$relogin" ]]; do
    relogin="$(generate_code)"
  done
  echo "Resetting CLIENT fixture for PROF-C scenario A..."
  psql "$DATABASE_URL" \
    -v ON_ERROR_STOP=1 \
    -v initial_code="$code" \
    -v relogin_code="$relogin" \
    -f "$RESET_SQL" >/dev/null
}

run_pass() {
  local label="$1"
  shift
  local code
  code="$(generate_code)"
  reset_fixture "$code"
  export M4C_LOGIN_CODE="$code"
  export M4C_ARTIFACTS_DIR="$ARTIFACTS"
  echo "Running ${label} scenario (code minted in test DB)..."
  node "$ROOT/scripts/local/m4c-browser-master-onboarding.mjs" "$@"
}

npx --yes playwright install chromium >/dev/null 2>&1 || true
mkdir -p "$ARTIFACTS/screenshots"

run_pass "desktop"
run_pass "mobile" --mobile

echo "Reports and screenshots written to $ARTIFACTS"
