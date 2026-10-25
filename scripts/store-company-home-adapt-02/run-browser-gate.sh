#!/usr/bin/env bash
set -euo pipefail
NAV_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../remcard-navigator" && pwd)"
PLATFORM_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ISO="$NAV_ROOT/scripts/prof-admin-moderation-isolated"
ART="$PLATFORM_ROOT/artifacts/store-company-home-adapt-02"
LOG="$ART/shell-browser-gate.log"
mkdir -p "$ART"

export CATALOG_QA_BACKEND_PORT=3421
export CATALOG_QA_FRONTEND_PORT=3420
export JWT_SECRET="${JWT_SECRET:-catalog-qa-local-jwt-signing-key-32chars-min}"
export HOME_ADAPT_FE_RUNTIME_SHA="${HOME_ADAPT_FE_RUNTIME_SHA:-1dcd79c2b740a91c6bc7d9624ad8f7ba5ac96cf1}"
export HOME_ADAPT_BE_RUNTIME_SHA="${HOME_ADAPT_BE_RUNTIME_SHA:-f3baba9ca2666a569efea16d238ef8ca68e7ee2d}"
export NAV_E2E_URL="http://127.0.0.1:${CATALOG_QA_BACKEND_PORT}"

GATE_E2E="$PLATFORM_ROOT/scripts/store-company-home-adapt-02/run-home-shell-e2e.mjs"
GATE_E2E_SAVED="$(mktemp)"
cp "$GATE_E2E" "$GATE_E2E_SAVED"
git -C "$NAV_ROOT" checkout -q "$HOME_ADAPT_BE_RUNTIME_SHA"
git -C "$PLATFORM_ROOT" checkout -q "$HOME_ADAPT_FE_RUNTIME_SHA"
cp "$GATE_E2E_SAVED" "$GATE_E2E"
rm -f "$GATE_E2E_SAVED"

echo "[home-adapt-02] bootstrap isolated PG (if needed)"
bash "$ISO/bootstrap.sh"

echo "[home-adapt-02] seed ui harness (store/company/master tokens)"
cd "$NAV_ROOT"
# shellcheck source=lib.sh
source "$ISO/lib.sh"
catalog_qa_export_test_env
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-ui-harness.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-business-home-shell.ts

echo "[home-adapt-02] start backend + production frontend"
CATALOG_QA_STOP_PG=0 CATALOG_QA_BACKEND_PORT=3421 CATALOG_QA_FRONTEND_PORT=3420 bash "$ISO/stop.sh" || true
CATALOG_QA_BACKEND_PORT=3421 CATALOG_QA_FRONTEND_PORT=3420 bash "$ISO/start.sh"
CATALOG_QA_BACKEND_PORT=3421 CATALOG_QA_FRONTEND_PORT=3420 PLATFORM_ROOT="$PLATFORM_ROOT" bash "$ISO/start-frontend.sh"

export PROF_E2E_URL="http://127.0.0.1:${CATALOG_QA_FRONTEND_PORT}"
export CATALOG_QA_UI_STATE="$NAV_ROOT/.catalog-qa-isolated/ui-harness-state.json"
export HOME_ADAPT_FE_RUNTIME_SHA HOME_ADAPT_BE_RUNTIME_SHA

cd "$PLATFORM_ROOT"
set +o pipefail
node scripts/store-company-home-adapt-02/run-home-shell-e2e.mjs 2>&1 | tee "$LOG"
e2e_exit=${PIPESTATUS[0]}
set -o pipefail

echo "$e2e_exit" >"$ART/shell-browser-gate.exit"
exit "$e2e_exit"
