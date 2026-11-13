# Clients parity — independent audit (2026-11-13)

**Task:** `REMCLIENTS-V3-QA-CANDIDATE` (continues V1/V2)  
**Owner:** independent QA on `cursor/remcard-wallet-dialog-width-20261103`  
**Allowlist:** this directory + `scripts/clients-parity-20261113/**` only. **No product code.**  
**implCandidateSha:** `ffd4aa6130e92af5d95da21cfe5519133228a962` · **intermediate:** `87c5ef62…` · (b062 is not latest)

## Start here

1. `08-V3-QA-SUMMARY.json` / `07-V3-AUTHOR-FOLLOWUP.md`  
2. `05-V3-QA-FORBIDDEN-COMPAT.md` — Computer rejected Gate/Context/route/helper/vitest delta  
3. `06-V3-BACKEND-HANDLERS-READONLY.md` — navigator `release/prof-backend-v1-20261007`  
4. `candidate-isolated-listview/` — real React mount of ObserverPartnersListView  
5. `requirement-matrix-c01-c56.json` — PASS_functional / PASS_safety / BLOCKED / FAIL  
6. Earlier V1/V2: `01`–`04`, `prototype-baseline/`, `candidate-mount/`  

## Validate (bounded)

```bash
node scripts/clients-parity-20261113/validate-audit-artifacts.mjs
```

## Capture (Chrome; no product edits)

```bash
WALLET_QA_CHROME=/usr/local/bin/google-chrome \
  node scripts/clients-parity-20261113/capture-prototype-observer-baseline.mjs
WALLET_QA_CHROME=/usr/local/bin/google-chrome \
  IMPL_CANDIDATE_SHA=ffd4aa6130e92af5d95da21cfe5519133228a962 \
  node scripts/clients-parity-20261113/capture-candidate-observer-mount.mjs
```

## Impl candidate

**implCandidateSha = `ffd4aa6130e92af5d95da21cfe5519133228a962`** (author branch tip; supersedes named `b0622e51` after re-read). When a newer author SHA appears, re-audit that SHA — do not substitute auditor HEAD.
