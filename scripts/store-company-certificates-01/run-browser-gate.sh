#!/usr/bin/env bash
set -euo pipefail
NAV_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../remcard-navigator" && pwd)"
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ISO="$NAV_ROOT/scripts/prof-admin-moderation-isolated"
ART="$PLATFORM_ROOT/artifacts/store-company-certificates-02-clean"
LOG="$ART/shell-browser-gate.log"
mkdir -p "$ART"

export E2E_APPLICATION_FRONTEND_SHA="$(git -C "$PLATFORM_ROOT" rev-parse HEAD)"
export E2E_APPLICATION_BACKEND_SHA="$(git -C "$NAV_ROOT" rev-parse HEAD)"
export E2E_CAPTURE_STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
echo "[certificates-01] application runtime FE=${E2E_APPLICATION_FRONTEND_SHA} BE=${E2E_APPLICATION_BACKEND_SHA}"

export CATALOG_QA_BACKEND_PORT=3421
export CATALOG_QA_FRONTEND_PORT=3420
export JWT_SECRET="${JWT_SECRET:-catalog-qa-local-jwt-signing-key-32chars-min}"

echo "[certificates-01] bootstrap isolated PG (if needed)"
bash "$ISO/bootstrap.sh"

echo "[certificates-01] seed ui harness + certificates"
cd "$NAV_ROOT"
# shellcheck source=lib.sh
source "$ISO/lib.sh"
catalog_qa_export_test_env
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-ui-harness.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-business-certificates-shell.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-business-owner-real-sessions.ts

echo "[certificates-01] start backend + production frontend"
CATALOG_QA_STOP_PG=0 CATALOG_QA_BACKEND_PORT=3421 CATALOG_QA_FRONTEND_PORT=3420 bash "$ISO/stop.sh" || true
CATALOG_QA_BACKEND_PORT=3421 CATALOG_QA_FRONTEND_PORT=3420 bash "$ISO/start.sh"
CATALOG_QA_BACKEND_PORT=3421 CATALOG_QA_FRONTEND_PORT=3420 PLATFORM_ROOT="$PLATFORM_ROOT" bash "$ISO/start-frontend.sh"

export PROF_E2E_URL="http://127.0.0.1:${CATALOG_QA_FRONTEND_PORT}"
export CATALOG_QA_UI_STATE="$NAV_ROOT/.catalog-qa-isolated/ui-harness-state.json"

cd "$PLATFORM_ROOT"
set +o pipefail
node scripts/store-company-certificates-01/run-certificates-shell-e2e.mjs 2>&1 | tee "$LOG"
e2e_exit=${PIPESTATUS[0]}
set -o pipefail

echo "$e2e_exit" >"$ART/shell-browser-gate.exit"
exit "$e2e_exit"
