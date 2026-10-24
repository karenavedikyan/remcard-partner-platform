#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NAV_ROOT="${CATALOG_QA_NAVIGATOR_ROOT:-$REPO_ROOT/../remcard-navigator}"
CATALOG_QA_FRONTEND_PORT="${CATALOG_QA_FRONTEND_PORT:-3400}"
CATALOG_QA_BACKEND_PORT="${CATALOG_QA_BACKEND_PORT:-3401}"
CATALOG_QA_RUN="${CATALOG_QA_RUN:-$NAV_ROOT/.catalog-qa-isolated/run}"
CATALOG_QA_LOG="${CATALOG_QA_LOG:-$NAV_ROOT/.catalog-qa-isolated/log}"

catalog_qa_frontend_env() {
  export REMCARD_API_BASE_URL="http://127.0.0.1:${CATALOG_QA_BACKEND_PORT}"
  export NEXT_PUBLIC_APP_URL="http://127.0.0.1:${CATALOG_QA_FRONTEND_PORT}"
  export NEXT_PUBLIC_BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://127.0.0.1:${CATALOG_QA_BACKEND_PORT}}"
  export PORT="$CATALOG_QA_FRONTEND_PORT"
  export HOSTNAME="127.0.0.1"
  export NODE_ENV="${NODE_ENV:-production}"
}
