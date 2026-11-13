# REMCLIENTS-PARITY-20261113-V1 — acknowledgement

**Task marker:** `REMCLIENTS-PARITY-20261113-V1` / CONTRACT AUDIT AND INDEPENDENT QA  
**Role:** independent verifier (`bc-0a64ca5a-…` / wallet-dialog agent). Product code owned by `bc-597b1474-…`.

## Workspace verification (actual, not metadata assumption)

| Field | Value |
|---|---|
| Branch | `cursor/remcard-wallet-dialog-width-20261103` |
| HEAD | `4f64b8cf24e4fe0dc1ec3e1081a663258a84ca94` |
| Dirty | **0** (clean) |
| Tracking | local matches prior wallet-dialog work; not release/main/prototype |
| Free disk | ~246G available on `/` |
| Isolation | Safe to write **only** `audit/clients-parity-20261113/**` and `scripts/clients-parity-20261113/**` |

**Note:** A prior turn cited `release/r1-purchase-access-message-20261110`. Actual checkout at task start was already the wallet-dialog target branch above. No checkout onto release/main; no reset/force-push; no new branch/PR/agent.

## Pinned SHAs (read-only)

| Purpose | SHA |
|---|---|
| Prototype etalon | `3dc31836cd18d9209c20097f18b906dd276f7af6` (`design/partner-profile-preview-20261112`) |
| Production app base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` (`release/prof-v1-20261007`) |
| Impl author remote tip (cabinet-nav; **not** yet a clients-parity FE candidate) | `origin/cursor/remcard-cabinet-nav-r5-final-20261103` → `1d8b5132` |

When a clients-parity **frontend candidate SHA** is published by the impl agent, re-audit that exact SHA; do not treat cabinet-nav tip or stale trees as the candidate.
