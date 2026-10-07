#!/usr/bin/env bash
# PROF-D scenario B: link invite browser acceptance (desktop 1440 + mobile 390).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ARTIFACTS="${M4D_ARTIFACTS_DIR:-/opt/cursor/artifacts/m4d-link-invite}"
RESET_SQL="$ROOT/scripts/local/reset-m4d-link-invite-scenario-b.sql.example"

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
  local store_code="$1"
  local client_code="$2"
  echo "Resetting PROF-D scenario B fixtures..."
  psql "$DATABASE_URL" \
    -v ON_ERROR_STOP=1 \
    -v store_code="$store_code" \
    -v client_code="$client_code" \
    -f "$RESET_SQL" >/dev/null
}

run_pass() {
  local label="$1"
  shift
  local store_code client_code
  store_code="$(generate_code)"
  client_code="$(generate_code)"
  while [[ "$store_code" == "$client_code" ]]; do
    client_code="$(generate_code)"
  done
  reset_fixture "$store_code" "$client_code"
  export M4D_STORE_CODE="$store_code"
  export M4D_CLIENT_CODE="$client_code"
  export M4D_ARTIFACTS_DIR="$ARTIFACTS"
  export DATABASE_URL
  echo "Running ${label} scenario (codes minted in test DB)..."
  node "$ROOT/scripts/local/m4d-browser-link-invite-accept.mjs" "$@"
}

npx --yes playwright install chromium >/dev/null 2>&1 || true
mkdir -p "$ARTIFACTS/screenshots"

run_pass "desktop"
run_pass "mobile" --mobile

echo "Reports and screenshots written to $ARTIFACTS"
