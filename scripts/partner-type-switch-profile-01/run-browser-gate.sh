#!/usr/bin/env bash
set -euo pipefail
NAV_ROOT="${NAV_ROOT:-/agent/repos/remcard-navigator}"
PLATFORM_ROOT="${PLATFORM_ROOT:-/agent/repos/remcard-partner-platform}"
ISO="$NAV_ROOT/scripts/prof-admin-moderation-isolated"
ART="$PLATFORM_ROOT/artifacts/partner-type-switch-profile-01"
LOG="$ART/shell-browser-gate.log"
mkdir -p "$ART"

export E2E_APPLICATION_FRONTEND_SHA="$(git -C "$PLATFORM_ROOT" rev-parse HEAD)"
export E2E_APPLICATION_BACKEND_SHA="$(git -C "$NAV_ROOT" rev-parse HEAD)"
export E2E_CAPTURE_STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

cd "$PLATFORM_ROOT"
pnpm exec tsc --noEmit >>"$LOG" 2>&1
pnpm run build >>"$LOG" 2>&1

bash "$ISO/bootstrap.sh" >>"$LOG" 2>&1
# shellcheck source=lib.sh
source "$ISO/lib.sh"
catalog_qa_export_test_env

cd "$NAV_ROOT"
pnpm exec vitest run \
  src/lib/__tests__/partnerKindUi.test.ts \
  src/lib/__tests__/partnerTypeSwitchGuard.test.ts \
  src/lib/__tests__/partnerTypeSwitch.integration.test.ts \
  src/lib/__tests__/partnerTypeSwitchProfTest.integration.test.ts \
  src/lib/__tests__/proWalletPartnerKind.test.ts \
  src/app/api/pro/partner-type/switch/__tests__/route.post.prof-test-fail-closed.test.ts \
  >>"$LOG" 2>&1

cd "$PLATFORM_ROOT"
pnpm exec vitest run src/components/profile/PartnerTypeSettings.test.tsx >>"$LOG" 2>&1

CATALOG_QA_STOP_PG=0 CATALOG_QA_BACKEND_PORT=3453 CATALOG_QA_FRONTEND_PORT=3452 bash "$ISO/stop.sh" >>"$LOG" 2>&1 || true
CATALOG_QA_BACKEND_PORT=3453 CATALOG_QA_FRONTEND_PORT=3452 bash "$ISO/start.sh" >>"$LOG" 2>&1
CATALOG_QA_BACKEND_PORT=3453 CATALOG_QA_FRONTEND_PORT=3452 PLATFORM_ROOT="$PLATFORM_ROOT" bash "$ISO/start-frontend.sh" >>"$LOG" 2>&1

export CATALOG_QA_BACKEND_PORT=3453
export CATALOG_QA_FRONTEND_PORT=3452
export PROF_E2E_URL="http://127.0.0.1:${CATALOG_QA_FRONTEND_PORT}"
export E2E_CAPTURE_STARTED_AT E2E_APPLICATION_FRONTEND_SHA E2E_APPLICATION_BACKEND_SHA

cd "$PLATFORM_ROOT"
node scripts/partner-type-switch-profile-01/run-browser-partner-type-switch.mjs >>"$LOG" 2>&1

echo "browser gate ok" >>"$LOG"
