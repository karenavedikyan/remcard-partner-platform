#!/usr/bin/env bash
set -euo pipefail
NAV_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../remcard-navigator" && pwd)"
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ISO="$NAV_ROOT/scripts/prof-admin-moderation-isolated"
ART="$PLATFORM_ROOT/artifacts/store-company-wallet-01"
LOG="$ART/shell-browser-gate.log"
mkdir -p "$ART"
: >"$LOG"

export E2E_APPLICATION_FRONTEND_SHA="$(git -C "$PLATFORM_ROOT" rev-parse HEAD)"
export E2E_APPLICATION_BACKEND_SHA="$(git -C "$NAV_ROOT" rev-parse HEAD)"
export E2E_CAPTURE_STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

export CATALOG_QA_BACKEND_PORT=3431
export CATALOG_QA_FRONTEND_PORT=3430
export JWT_SECRET="${JWT_SECRET:-catalog-qa-local-jwt-signing-key-32chars-min}"

bash "$ISO/bootstrap.sh"
cd "$NAV_ROOT"
source "$ISO/lib.sh"
catalog_qa_export_test_env
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-ui-harness.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-business-owner-real-sessions.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-business-wallet-gate-fixtures.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-business-wallet-gate-access-fixtures.ts
pnpm exec vitest run src/lib/__tests__/profTestOwnerFinancialWrite.integration.test.ts >"$ART/pg-prof-test-financial-guard.log" 2>&1 || {
  echo "prof-test financial guard integration failed" >>"$LOG"
  cat "$ART/pg-prof-test-financial-guard.log" >>"$LOG"
  exit 1
}
pnpm exec vitest run src/lib/__tests__/profIPayout.integration.test.ts -t "concurrent idempotent" >"$ART/pg-payout-concurrent.log" 2>&1 || {
  echo "payout concurrent integration failed" >>"$LOG"
  cat "$ART/pg-payout-concurrent.log" >>"$LOG"
  exit 1
}

CATALOG_QA_STOP_PG=0 CATALOG_QA_BACKEND_PORT=3431 CATALOG_QA_FRONTEND_PORT=3430 bash "$ISO/stop.sh" || true
CATALOG_QA_BACKEND_PORT=3431 CATALOG_QA_FRONTEND_PORT=3430 bash "$ISO/start.sh"
CATALOG_QA_BACKEND_PORT=3431 CATALOG_QA_FRONTEND_PORT=3430 PLATFORM_ROOT="$PLATFORM_ROOT" bash "$ISO/start-frontend.sh"

export PROF_E2E_URL="http://127.0.0.1:${CATALOG_QA_FRONTEND_PORT}"
export CATALOG_QA_UI_STATE="$NAV_ROOT/.catalog-qa-isolated/ui-harness-state.json"

cd "$PLATFORM_ROOT"
set +o pipefail
node scripts/store-company-wallet-01/run-wallet-shell-e2e.mjs 2>&1 | tee "$LOG"
e2e_exit=${PIPESTATUS[0]}
set -o pipefail
echo "$e2e_exit" >"$ART/shell-browser-gate.exit"
exit "$e2e_exit"
