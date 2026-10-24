#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
NAV_ROOT="${CATALOG_QA_NAVIGATOR_ROOT:-$REPO_ROOT/../remcard-navigator}"
ART="$REPO_ROOT/artifacts/test-catalog-isolated-acceptance"
mkdir -p "$ART"

PARTNER_ID="${E2E_PARTNER_ID:-}"
if [[ -z "$PARTNER_ID" && -f "$NAV_ROOT/.catalog-qa-isolated/e2e-partner-id.txt" ]]; then
  PARTNER_ID="$(cat "$NAV_ROOT/.catalog-qa-isolated/e2e-partner-id.txt")"
fi
if [[ -z "$PARTNER_ID" ]]; then
  echo "run seed-e2e-fixture.sh in remcard-navigator first" >&2
  exit 1
fi

export E2E_PARTNER_ID="$PARTNER_ID"
export E2E_BACKEND_BASE="http://127.0.0.1:${CATALOG_QA_BACKEND_PORT:-3401}"
cd "$REPO_ROOT"
node scripts/catalog-qa-isolated/run-e2e.mjs
echo "[e2e] screenshots in $ART"
