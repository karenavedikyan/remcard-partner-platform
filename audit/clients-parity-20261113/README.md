# Clients parity — independent audit (2026-11-13)

**Task:** `REMCLIENTS-PARITY-20261113-V2-QA` (continues V1)  
**Owner:** independent QA on `cursor/remcard-wallet-dialog-width-20261103`  
**Allowlist:** this directory + `scripts/clients-parity-20261113/**` only. **No product code.**

## Start here

1. `00-ACKNOWLEDGEMENT.md`  
2. `01-EARLY-API-OWNERSHIP-PERSISTENCE-BLOCKERS.md`  
3. `02-V2-QA-STATIC-COMPAT.md` — `b0622e51` → `ffd4aa61`, `canLinkOnboardingHistory`  
4. `03-V2-VISUAL-BASELINE-AND-DIFF.md` — baselines + overlays  
5. `04-V2-QA-SUMMARY.json` — SHAs, counts, evidence roots  
6. `requirement-matrix-c01-c56.json` — C01–C56 auditor statuses  
7. `page-matrix.json` — pages 79–123 + 141–147  
8. `contract-audit.json` — FE proxy / helpers / BLOCKED contracts  
9. `prototype-baseline/` + `candidate-mount/` — screenshots & computed styles  

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
