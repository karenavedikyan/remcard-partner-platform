#!/usr/bin/env bash
# Transient P3×P4 stack verify — does NOT commit P4 files.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
P4_TIP="${P4_TIP:-effd85f3e7ca8b4ce1a373074e95d975d89cc492}"
LOG="$ROOT/audit/remcard-parallel-20261113/P3/vitest-p3-p4-stack.log"
DETAIL=(
  src/components/clients/observer/ObserverClientDetailView.tsx
  src/components/clients/observer/ObserverPartnerDetailView.tsx
)
restore() {
  git checkout HEAD -- "${DETAIL[@]}" 2>/dev/null || true
}
trap restore EXIT
git checkout "$P4_TIP" -- "${DETAIL[@]}"
{
  echo "# P4 tip $P4_TIP (transient)"
  ./node_modules/.bin/vitest run src/components/clients/observer/P3.*.test.tsx
} | tee "$LOG"
