# Clients parity — independent audit (2026-11-13)

**Task:** `REMCLIENTS-V6-COMPUTER-RESULTS`  
**Allowlist:** this directory + `scripts/clients-parity-20261113/**` only.

## Authoritative pin

**implCandidateSha = `78e4852194a0b9d307ee92743ae754dd18d5a9ba`** (product fix `5063368a`)  
Prior V5 tip `42f9fae9` does **not** cover V6. Later `0729c12f` is **not** the Computer pin.

## Start here

1. `21-V6-COMPUTER-RESULTS-SUMMARY.json` / `requirement-matrix-c01-c56.json`
2. `19-V6-COMPUTER-RESULTS-78e48521.md` — independent real-click replay
3. `20-V6-SELECTED-FILE-MANIFEST.md` — author handoff include/exclude + blockers
4. `v6-pin-78e48521/` — screenshots + reports

## Counts

`PASS_functional=5` · `PASS_safety=4` · `FAIL=10` · `BLOCKED=23` · `BLOCKED_PERSISTENCE=4` · `NOT_STARTED=9` · `EXCLUDED=1` · **TOTAL=56**

Isolated mobile-row + KPI regressions only. Section packaging/contracts **not accepted**.
