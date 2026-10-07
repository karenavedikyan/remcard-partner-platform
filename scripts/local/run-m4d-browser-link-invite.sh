#!/usr/bin/env bash
# PROF-D link-invite browser acceptance (registration, moderation accept, PRO, 401).
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
  local staff_code="$3"
  local master_code="$4"
  local relogin_code="$5"
  echo "Resetting PROF-D fixtures..."
  psql "$DATABASE_URL" \
    -v ON_ERROR_STOP=1 \
    -v store_code="$store_code" \
    -v client_code="$client_code" \
    -v staff_code="$staff_code" \
    -v master_code="$master_code" \
    -v relogin_code="$relogin_code" \
    -f "$RESET_SQL" >/dev/null
}

run_scenario() {
  local label="$1"
  shift
  local store_code client_code staff_code master_code relogin_code
  store_code="$(generate_code)"
  client_code="$(generate_code)"
  staff_code="$(generate_code)"
  master_code="$(generate_code)"
  relogin_code="$(generate_code)"
  while [[ "$store_code" == "$client_code" || "$store_code" == "$staff_code" || "$client_code" == "$master_code" ]]; do
    client_code="$(generate_code)"
  done
  reset_fixture "$store_code" "$client_code" "$staff_code" "$master_code" "$relogin_code"
  export M4D_STORE_CODE="$store_code"
  export M4D_CLIENT_CODE="$client_code"
  export M4D_STAFF_CODE="$staff_code"
  export M4D_MASTER_CODE="$master_code"
  export M4D_RELOGIN_CODE="$relogin_code"
  export M4D_ARTIFACTS_DIR="$ARTIFACTS"
  export DATABASE_URL
  export REMCARD_API_BASIC_USER="${REMCARD_API_BASIC_USER:-m1test}"
  export REMCARD_API_BASIC_PASSWORD="${REMCARD_API_BASIC_PASSWORD:-}"
  if [[ -f "$ROOT/.env.local" ]]; then
    # shellcheck disable=SC1091
    set -a && source "$ROOT/.env.local" && set +a
  fi
  echo "Running ${label}..."
  node "$@"
  sleep 8
}

npx --yes playwright install chromium >/dev/null 2>&1 || true
mkdir -p "$ARTIFACTS/screenshots"

run_scenario "B-reg desktop" "$ROOT/scripts/local/m4d-browser-link-invite-registration.mjs"
run_scenario "B-reg mobile" "$ROOT/scripts/local/m4d-browser-link-invite-registration.mjs" --mobile
run_scenario "B-accept desktop" "$ROOT/scripts/local/m4d-browser-link-invite-moderation-accept.mjs"
run_scenario "B-accept mobile" "$ROOT/scripts/local/m4d-browser-link-invite-moderation-accept.mjs" --mobile
run_scenario "C PRO accept" "$ROOT/scripts/local/m4d-browser-link-invite-pro-accept.mjs"
run_scenario "D 401 relogin" "$ROOT/scripts/local/m4d-browser-link-invite-401.mjs"

echo "Reports and screenshots written to $ARTIFACTS"
