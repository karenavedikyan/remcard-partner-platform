# REMCLIENTS-PARITY-20261113 — acknowledgement (V1 → V2-QA)

**Task markers:** `REMCLIENTS-PARITY-20261113-V1` then `REMCLIENTS-PARITY-20261113-V2-QA`  
**Canonical:** https://www.perplexity.ai/computer/tasks/c7ca575a-0a2a-4ae4-92b9-0e0c535046f8  
**Role:** independent verifier on `cursor/remcard-wallet-dialog-width-20261103`. Product Clients code owned by `bc-597b1474-d7e7-4df1-b4a2-cf2f6abcb629`.

## Workspace verification

| Field | Value |
|---|---|
| Branch | `cursor/remcard-wallet-dialog-width-20261103` |
| Prior audit HEAD | `4d75d322` (V1 early blockers) |
| Allowlist | `audit/clients-parity-20261113/**`, `scripts/clients-parity-20261113/**` only |
| Isolation | No product/backend/DB/rights/finance/infra/env/deploy/deps/lockfile; no new agents/branches/PRs |

## Pinned SHAs

| Purpose | SHA |
|---|---|
| Prototype etalon | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| Production app base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Named interim impl | `b0622e519a4aea9b8ffbeac194e95d40a196ec8b` |
| **Current implCandidateSha** (author tip) | `ffd4aa6130e92af5d95da21cfe5519133228a962` |
| Author branch | `cursor/remcard-cabinet-nav-r5-final-20261103` |
| Protected estimate | `a6ae55eb6d984880` — **not requested** |

## V2-QA one-liner

`b0622e51` dropped `canLinkOnboardingHistory` (FAIL). Tip `ffd4aa61` restores the prop but gate rewrite diverges from `57ca4680`; visual mount **0/12 PASS**; referred/receiving/personal contracts remain **BLOCKED**. Safety PASSes are not functional readiness.
