# Clients parity — independent audit (2026-11-13)

**Task:** `REMCLIENTS-V6-REAL-MOBILE-BLOCKER` (supplements V5)  
**Allowlist:** this directory + `scripts/clients-parity-20261113/**` only.

## Pins (V6)

| Role | SHA |
|---|---|
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| Packaging base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Computer FAIL (0-width open) | `d1da9484…` @ 375 dark |
| **correctedSha** | `0729c12f1e321b1aa458d95016eb4cc3f4428f6f` |

## Start here

1. `18-V6-QA-SUMMARY.json` / `requirement-matrix-c01-c56.json` — **TOTAL=56**
2. `17-V6-QA-MOBILE-CLIENT-ROW.md` — real-click geometry
3. `v6-mobile-click-e0729c12/` — screenshots + computed click report
4. V5 KPI: `14-V5-QA-KPI-CASCADE.md` (still PASS on tip)

## Counts

`PASS_functional=5` · `PASS_safety=4` · `FAIL=10` · `BLOCKED=23` · `BLOCKED_PERSISTENCE=4` · `NOT_STARTED=9` · `EXCLUDED=1` · **TOTAL=56**

Mobile client open measured PASS; section packaging/contracts **not accepted**. No fake save / no AgentClient-deletion unblock.
