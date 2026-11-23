#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BASE="$ROOT/base"
HEAD="$ROOT/head"
PATCH_OUT="$ROOT/../../artifacts/remcard-max-login-recovery-20261123/be.patch"
CHECKSUMS="$ROOT/../../artifacts/remcard-max-login-recovery-20261123/checksums.txt"
WORKDIR="$ROOT/git-wt"
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
cp -a "$BASE/." "$WORKDIR/"
cd "$WORKDIR"
git init -q
git config user.email "agent@cursor.local"
git config user.name "Cursor Agent"
git add -A
git commit -q -m "base fec124d463fa024a24b98e8229c7ae02b52add49"
cp -a "$HEAD/." "$WORKDIR/"
git add -A
git diff --cached > "$PATCH_OUT"
sha256sum "$PATCH_OUT" | tee "$CHECKSUMS"
rm -rf "$ROOT/verify"
mkdir -p "$ROOT/verify"
cp -a "$BASE/." "$ROOT/verify/"
cd "$ROOT/verify"
git init -q
git add -A
git commit -q -m base
git apply --check "$PATCH_OUT"
echo "git apply --check: OK"