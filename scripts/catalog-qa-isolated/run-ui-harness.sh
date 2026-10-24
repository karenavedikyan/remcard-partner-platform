#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"
export CATALOG_QA_NAVIGATOR_ROOT="${CATALOG_QA_NAVIGATOR_ROOT:-$REPO_ROOT/../remcard-navigator}"
export CATALOG_QA_FRONTEND_URL="http://127.0.0.1:${CATALOG_QA_FRONTEND_PORT:-3400}"
export CATALOG_QA_BACKEND_URL="http://127.0.0.1:${CATALOG_QA_BACKEND_PORT:-3401}"
cd "$REPO_ROOT"
node scripts/catalog-qa-isolated/run-ui-harness.mjs
