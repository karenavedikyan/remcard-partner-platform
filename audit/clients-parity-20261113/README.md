# Clients parity — independent audit (2026-11-13)

**Task:** `REMCLIENTS-V8-AUDIT-REMAINING`  
**Allowlist:** this directory + `scripts/clients-parity-20261113/**` only.

## Authoritative pins

| Pass | SHA |
|---|---|
| **V8 candidate / productFix** | `140de0a83044f324bf455ac2dfb87b17432fb8d1` |
| Author tip (Computer) | `a36c609b7ea7a43ce4f4ec544f7ad0e60b403447` |
| Production base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Stale productFixSha (ignore) | `5063368aea4a4219…` |

## Start here

1. `25-V8-QA-SUMMARY.json` / `24-V8-AUDIT-REMAINING.md`
2. `requirement-matrix-c01-c56.json` — remaining ledger (UI vs server distinguished)
3. `26-V8-CONTRACT-INVENTORY-READONLY.md` + `v8-corrected-patch-manifest-57ca4680.json`
4. `22-V7-CASCADE-EXACT-PARITY-140de0a8.md` — cascade pin history

## Counts

`PASS_functional=5` · `PASS_safety=4` · `FAIL=10` · `BLOCKED_CONTRACT=23` · `BLOCKED_PERSISTENCE=4` · `NOT_STARTED=9` · `EXCLUDED=1` · **TOTAL=56**

Computer V8 isolated regressions only. Section packaging/contracts **not accepted**.
