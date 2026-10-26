#!/usr/bin/env bash
set -euo pipefail
NAV_ROOT="${NAV_ROOT:-/agent/repos/remcard-navigator}"
PLATFORM_ROOT="${PLATFORM_ROOT:-/agent/repos/remcard-partner-platform}"
ISO="$NAV_ROOT/scripts/prof-admin-moderation-isolated"
ART="$PLATFORM_ROOT/artifacts/public-agent-terms-and-invite-flow-01"
LOG="$ART/shell-browser-gate.log"
mkdir -p "$ART"

export E2E_APPLICATION_FRONTEND_SHA="$(git -C "$PLATFORM_ROOT" rev-parse HEAD)"
export E2E_APPLICATION_BACKEND_SHA="$(git -C "$NAV_ROOT" rev-parse HEAD)"
export E2E_CAPTURE_STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
echo "[agent-terms-flow] FE=${E2E_APPLICATION_FRONTEND_SHA} BE=${E2E_APPLICATION_BACKEND_SHA}" | tee "$LOG"

cd "$PLATFORM_ROOT"
pnpm run test:proxy >>"$LOG" 2>&1
pnpm exec vitest run src/lib/partner-certificate-program.test.ts 2>/dev/null || true
pnpm exec tsc --noEmit >>"$LOG" 2>&1
pnpm run build >>"$LOG" 2>&1

cd "$NAV_ROOT"
pnpm exec vitest run \
  src/lib/__tests__/partnershipInviteTerms.test.ts \
  src/lib/__tests__/partnershipPendingAccept.test.ts \
  src/lib/__tests__/partnershipActions.accept-notify.test.ts \
  src/lib/__tests__/partnershipAgentInviter.test.ts \
  src/lib/__tests__/parsePoolPercentInput.test.ts \
  src/lib/__tests__/orgLimitsMutatingAccess.integration.test.ts \
  src/app/api/partnership/invite/__tests__/route.empty-terms.test.ts \
  src/app/api/partnership/\[id\]/__tests__/route.accept-pending-notify.test.ts \
  src/app/api/partnership/\[id\]/__tests__/route.accept-pending-version.test.ts \
  src/app/api/partner/\[id\]/certificate-program-summary/__tests__/route.test.ts \
  >>"$LOG" 2>&1

bash "$ISO/bootstrap.sh" >>"$LOG" 2>&1
# shellcheck source=lib.sh
source "$ISO/lib.sh"
catalog_qa_export_test_env
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-ui-harness.ts >>"$LOG" 2>&1
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-agent-terms-invite-flow.ts >>"$LOG" 2>&1

CATALOG_QA_STOP_PG=0 CATALOG_QA_BACKEND_PORT=3453 CATALOG_QA_FRONTEND_PORT=3452 bash "$ISO/stop.sh" >>"$LOG" 2>&1 || true
CATALOG_QA_BACKEND_PORT=3453 CATALOG_QA_FRONTEND_PORT=3452 bash "$ISO/start.sh" >>"$LOG" 2>&1
CATALOG_QA_BACKEND_PORT=3453 CATALOG_QA_FRONTEND_PORT=3452 PLATFORM_ROOT="$PLATFORM_ROOT" bash "$ISO/start-frontend.sh" >>"$LOG" 2>&1

export PROF_E2E_URL="http://127.0.0.1:${CATALOG_QA_FRONTEND_PORT:-3452}"
export CATALOG_QA_UI_STATE="$NAV_ROOT/.catalog-qa-isolated/ui-harness-state.json"
cd "$PLATFORM_ROOT"
node scripts/public-agent-terms-and-invite-flow-01/run-shell-e2e.mjs 2>&1 | tee -a "$LOG"
node scripts/public-agent-terms-and-invite-flow-01/run-browser-clickthrough.mjs 2>&1 | tee -a "$LOG"

echo "[agent-terms-flow] OK" | tee -a "$LOG"
