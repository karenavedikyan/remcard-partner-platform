#!/usr/bin/env bash
# UX-02 browser gate — loopback PG :55432, backend :3421, PROF :3420 (navigator harness).
set -euo pipefail
PARTNER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NAV_ROOT="${NAV_ROOT:-$PARTNER_ROOT/../remcard-navigator}"
ART="$PARTNER_ROOT/artifacts/prof-admin-moderation-ux-02"
mkdir -p "$ART/screenshots/passed" "$ART/screenshots/failed"

export PROF_MOD_E2E_ARTIFACTS="$ART/screenshots"
export CATALOG_QA_BACKEND_PORT=3421
export CATALOG_QA_FRONTEND_PORT=3420

cd "$NAV_ROOT"
bash scripts/prof-admin-moderation-isolated/bootstrap.sh
bash scripts/prof-admin-moderation-isolated/run-browser-gate.sh 2>&1 | tee "$ART/browser-gate.log"
