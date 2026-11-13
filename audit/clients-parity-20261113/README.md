# Clients parity — independent audit (2026-11-13)

**Task:** `REMCLIENTS-PARITY-20261113-V1`  
**Owner:** independent QA agent on `cursor/remcard-wallet-dialog-width-20261103`  
**Allowlist:** this directory + `scripts/clients-parity-20261113/**` only. **No product code.**

## Start here

1. `00-ACKNOWLEDGEMENT.md` — branch/HEAD/dirty isolation  
2. `01-EARLY-API-OWNERSHIP-PERSISTENCE-BLOCKERS.md` — **early blocker report (read first)**  
3. `page-matrix.json` — pages 79–123 + 141–147  
4. `action-inventory.json` — prototype `data-ca-*` / `data-observer-*`  
5. `contract-audit.json` — existing vs missing APIs  
6. `element-state-matrix.csv` — requirement rows (expand as candidate SHA arrives)

## Validate (bounded)

```bash
node scripts/clients-parity-20261113/validate-audit-artifacts.mjs
```

## Impl candidate

When `bc-597b1474-…` publishes a clients-parity FE SHA + file list, record it in matrices and re-compare **that** SHA. Do not treat cabinet-nav tip as the candidate.
