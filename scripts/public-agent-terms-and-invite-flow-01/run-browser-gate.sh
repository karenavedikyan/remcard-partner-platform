#!/usr/bin/env bash
set -euo pipefail
NAV_ROOT="${NAV_ROOT:-/agent/repos/remcard-navigator}"
PROF_ROOT="${PROF_ROOT:-/agent/repos/remcard-partner-platform}"
ISO="$NAV_ROOT/scripts/prof-admin-moderation-isolated"
export CATALOG_QA_ROOT="${CATALOG_QA_ROOT:-$NAV_ROOT/.catalog-qa-isolated}"
export CATALOG_QA_UI_STATE="$CATALOG_QA_ROOT/ui-harness-state.json"

cd "$NAV_ROOT"
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-ui-harness.ts
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-agent-terms-invite-flow.ts

cd "$PROF_ROOT"
node scripts/public-agent-terms-and-invite-flow-01/run-shell-e2e.mjs
