# Clients parity — independent audit (2026-11-13)

**Task:** `REMCLIENTS-V7-0729-CASCADE-EXACT-PARITY`  
**Allowlist:** this directory + `scripts/clients-parity-20261113/**` only.

## Authoritative pins

| Pass | SHA |
|---|---|
| **V7 cascade / same-row (EXACT)** | `140de0a83044f324bf455ac2dfb87b17432fb8d1` |
| V6 Computer mobile-click + KPI | `78e4852194a0b9d307ee92743ae754dd18d5a9ba` |
| Obsolete `0729c12f` | click PASS ≠ visual same-row PASS — **do not promote** (auditor `65df323e`) |

## Start here

1. `23-V7-QA-SUMMARY.json` / `22-V7-CASCADE-EXACT-PARITY-140de0a8.md`
2. `v7-pin-140de0a8/` — FAIL@0729 vs PASS@140de0a8 screenshots + report
3. `21-V6-COMPUTER-RESULTS-SUMMARY.json` — prior isolated click/KPI pin
4. `requirement-matrix-c01-c56.json` — section still BLOCKED_CONTRACT/PERSISTENCE

## Counts

`PASS_functional=5` · `PASS_safety=4` · `FAIL=10` · `BLOCKED=23` · `BLOCKED_PERSISTENCE=4` · `NOT_STARTED=9` · `EXCLUDED=1` · **TOTAL=56**

Isolated V7 cascade + prior V6 mobile-row/KPI only. Section packaging/contracts **not accepted**.
