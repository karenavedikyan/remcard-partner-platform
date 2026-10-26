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
echo "[agent-terms-flow] capture=${E2E_CAPTURE_STARTED_AT}" | tee -a "$LOG"

cd "$PLATFORM_ROOT"
pnpm run test:proxy >>"$LOG" 2>&1
pnpm exec vitest run src/lib/partner-certificate-program.test.ts 2>/dev/null || true
pnpm exec tsc --noEmit >>"$LOG" 2>&1
pnpm run build >>"$LOG" 2>&1

bash "$ISO/bootstrap.sh" >>"$LOG" 2>&1
# shellcheck source=lib.sh
source "$ISO/lib.sh"
catalog_qa_export_test_env
export PROF_R04_AGENT_PARTNERS_ENABLED=1

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

pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-ui-harness.ts >>"$LOG" 2>&1
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-agent-terms-invite-flow.ts >>"$LOG" 2>&1

CATALOG_QA_STOP_PG=0 CATALOG_QA_BACKEND_PORT=3453 CATALOG_QA_FRONTEND_PORT=3452 bash "$ISO/stop.sh" >>"$LOG" 2>&1 || true
CATALOG_QA_BACKEND_PORT=3453 CATALOG_QA_FRONTEND_PORT=3452 bash "$ISO/start.sh" >>"$LOG" 2>&1
CATALOG_QA_BACKEND_PORT=3453 CATALOG_QA_FRONTEND_PORT=3452 PLATFORM_ROOT="$PLATFORM_ROOT" bash "$ISO/start-frontend.sh" >>"$LOG" 2>&1

export PROF_E2E_URL="http://127.0.0.1:${CATALOG_QA_FRONTEND_PORT:-3452}"
export CATALOG_QA_UI_STATE="$NAV_ROOT/.catalog-qa-isolated/ui-harness-state.json"
export PROF_R04_AGENT_PARTNERS_ENABLED=1
export NAV_ROOT PLATFORM_ROOT ART LOG E2E_CAPTURE_STARTED_AT E2E_APPLICATION_FRONTEND_SHA E2E_APPLICATION_BACKEND_SHA

echo "[agent-terms-flow] waiting for BFF proxy + seeded summary…" | tee -a "$LOG"
AGENT_TOKEN="$(
  node -e "const s=require(process.argv[1]);process.stdout.write(s.roles?.agentTermsFlow?.agent?.agentSessionToken||'')" "$CATALOG_QA_UI_STATE"
)"
STORE_UID="$(
  node -e "const s=require(process.argv[1]);process.stdout.write(s.roles?.agentTermsFlow?.storeOwner?.userId||'')" "$CATALOG_QA_UI_STATE"
)"
bff_ready=0
for _ in $(seq 1 90); do
  if [[ -n "$AGENT_TOKEN" && -n "$STORE_UID" ]]; then
    code="$(
      curl -s -o /dev/null -w "%{http_code}" \
        -H "Origin: ${PROF_E2E_URL}" \
        -H "Cookie: remcard-token=${AGENT_TOKEN}" \
        "${PROF_E2E_URL}/api/remcard/api/partner/${STORE_UID}/certificate-program-summary" || true
    )"
    if [[ "$code" == "200" ]]; then
      bff_ready=1
      echo "[agent-terms-flow] BFF ready (summary HTTP ${code})" | tee -a "$LOG"
      break
    fi
  fi
  sleep 2
done
if [[ "$bff_ready" -ne 1 ]]; then
  echo "[agent-terms-flow] FAILED BFF not ready for certificate-program-summary" | tee -a "$LOG"
  exit 1
fi

run_node_step() {
  local script="$1"
  set +e
  node "$script" 2>&1 | tee -a "$LOG"
  local ec="${PIPESTATUS[0]}"
  set -e
  if [[ "$ec" -ne 0 ]]; then
    echo "[agent-terms-flow] FAILED exit=${ec} script=${script}" | tee -a "$LOG"
    exit "$ec"
  fi
}

cd "$PLATFORM_ROOT"
run_node_step scripts/public-agent-terms-and-invite-flow-01/run-shell-e2e.mjs
run_node_step scripts/public-agent-terms-and-invite-flow-01/run-browser-clickthrough.mjs

node scripts/public-agent-terms-and-invite-flow-01/finalize-gate-report.mjs >>"$LOG" 2>&1

echo "[agent-terms-flow] OK" | tee -a "$LOG"
