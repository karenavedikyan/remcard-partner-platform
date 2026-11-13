# П6 → P2 / P3 / P4 — `receivingPartnerUserId` (cross-owner, do not cherry-pick 7ebfa955 observer paths)

Commit `7ebfa955` mistakenly touched files outside П6 ownership. Root will **not** integrate those paths from П6. П6 reverted them at tip (restore to `2784ed42`).

## Required owner actions

| Owner | Path | Change |
|-------|------|--------|
| **P2** | `src/lib/clients-parity/types.ts`, `contracts.ts` | Add `receivingPartnerUserId?: string` on observer DTOs; document User.id ≠ Branch.id |
| **P3** | `filter-observer.ts`, `observer-stats.ts`, observer list/workspace | Group/filter by `receivingPartnerUserId ?? receivingPartnerId` |
| **P4** | Observer detail | Display partner name via User principal id |

## Wire source of truth

K1 list rows emit `receivingPartnerUserId` (K8 `6f09c23e`). Prototype `receivingPartnerId` remains alias for same User.id.

П6 documents only in `receiving-appeals-api.ts` + this handoff — **no further observer edits on П6 branch**.
