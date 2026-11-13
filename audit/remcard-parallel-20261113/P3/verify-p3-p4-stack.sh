#!/usr/bin/env bash
# Transient P3×P4 stack verify — does NOT commit P4 files.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
P4_TIP="${P4_TIP:-ad7b0824b39ffedd576af84d18be64782611d6b5}"
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
