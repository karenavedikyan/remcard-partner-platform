#!/usr/bin/env bash
set -euo pipefail
NAV_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../remcard-navigator" && pwd)"
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ISO="$NAV_ROOT/scripts/prof-admin-moderation-isolated"
ART="$PLATFORM_ROOT/artifacts/store-company-incoming-client-orders-01"
LOG="$ART/shell-browser-gate.log"
mkdir -p "$ART"

export E2E_APPLICATION_FRONTEND_SHA="$(git -C "$PLATFORM_ROOT" rev-parse HEAD)"
export E2E_APPLICATION_BACKEND_SHA="$(git -C "$NAV_ROOT" rev-parse HEAD)"
export E2E_CAPTURE_STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

export CATALOG_QA_BACKEND_PORT=3421
export CATALOG_QA_FRONTEND_PORT=3420
export JWT_SECRET="${JWT_SECRET:-catalog-qa-local-jwt-signing-key-32chars-min}"

bash "$ISO/bootstrap.sh"
cd "$NAV_ROOT"
source "$ISO/lib.sh"
catalog_qa_export_test_env
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-ui-harness.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-business-owner-real-sessions.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-business-clients-gate-fixtures.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-business-client-receiving-purchase.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-business-client-receiving-leak-fixture.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-incoming-client-order-link-fixture.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/verify-incoming-client-order-migrations.ts \
  | tee "$ART/migration-verify.json"

CATALOG_QA_STOP_PG=0 CATALOG_QA_BACKEND_PORT=3421 CATALOG_QA_FRONTEND_PORT=3420 bash "$ISO/stop.sh" || true
CATALOG_QA_BACKEND_PORT=3421 CATALOG_QA_FRONTEND_PORT=3420 bash "$ISO/start.sh"
CATALOG_QA_BACKEND_PORT=3421 CATALOG_QA_FRONTEND_PORT=3420 PLATFORM_ROOT="$PLATFORM_ROOT" bash "$ISO/start-frontend.sh"

export PROF_E2E_URL="http://127.0.0.1:${CATALOG_QA_FRONTEND_PORT}"
export CATALOG_QA_UI_STATE="$NAV_ROOT/.catalog-qa-isolated/ui-harness-state.json"

cd "$PLATFORM_ROOT"
set +o pipefail
node scripts/store-company-incoming-client-orders-01/run-incoming-shell-e2e.mjs 2>&1 | tee -a "$LOG"
e2e_exit=${PIPESTATUS[0]}
set -o pipefail
echo "$e2e_exit" >"$ART/shell-browser-gate.exit"
exit "$e2e_exit"
