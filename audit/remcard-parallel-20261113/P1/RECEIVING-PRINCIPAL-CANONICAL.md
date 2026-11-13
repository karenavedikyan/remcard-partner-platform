# Receiving principal — canonical correction (Root, 2026-11-13)

**Status:** coordination pin only — **K8** must revise schema/core before acceptance. **No** migrate/execute. Section **not** publishable.

## Problem (source-verified)

| Source | Fact |
|--------|------|
| `specialistR06Eligibility.ts` @ `89fb8e07` | Solo specialist eligible **only without** owned `Organization` (`ownedOrg` → `org_owner` ineligible). |
| Partner `57ca4680` | `requireOwnerClientsContext` / `OwnerClientsGate` already allows this specialist principal for Clients. |
| K8 `contract.ts` @ `fc33b4fa` | `ClientAppealRecord` requires `receivingOrganizationId` + `receivingBranchId`. |
| K1 solo receiving scope (reported) | Requiring owned org makes **receiving impossible** for eligible solo specialists. |

Earlier interpretation **retracted:** `receivingPartnerId = Branch.id` as blanket identity.

## Canonical model (one definition — P2 coordinates DTO)

1. **`receivingPartnerUserId`** (required): trusted receiving principal **`User.id`** — matches prototype `partnerSettings[receivingPartnerId]`.
2. **`receivingOrganizationId`** / **`receivingBranchId`**: **optional** scope when they exist for that principal; **null** for eligible solo specialist (no dummy ids, no auto org).
3. **Receiving auth:** `requireOwnerClientsContext` on **owner principal**; agent UI stays **observer-only**.
4. **Org workplace CRM:** may resolve owner principal for reads; **never** substitute as `viewerUserId` for observer personal overlay (write 403 preserved).
5. **Observer `by-partner`:** route param = **`receivingPartnerUserId`**, not branch. Partner card metadata from User/partner profile, branch optional.
6. **Active slot:** prototype `isActiveAppeal` (refused/return inactive); uniqueness **`(certificateId, receivingPartnerUserId)`**; audit archive/trash vs `findActiveAppeal` before allowing duplicate actives.

Machine-readable pin: `src/lib/clients-parity/canonical-receiving-principal.json`.

## Partner UI (P1 view-model, no product wire change)

`ObserverReferredAppeal.receivingPartnerId` in `types.ts` is a **legacy field name** meaning **`receivingPartnerUserId`** — not `Branch.id`. Adapters (**P3/P2**) map K2 DTO after K8 correction.

## Proxy (unchanged this correction)

`remcard-proxy.ts`: **K5 only** (`personal-meta`, `personal-batch`). No gate/context edits. K2 GET pending P3 adapter.

## Owners

| Owner | Action |
|-------|--------|
| **K8** | Additive schema/migration **source only** — required `receivingPartnerUserId`, optional org/branch |
| **K1** | Receiving routes keyed to principal User.id |
| **K2** | Observer list/detail/by-partner on principal id |
| **P2** | One revised DTO; update matrix `ac2d4a7b` lineage |
| **P1** | Pin + docs; **no** schema, **no** proxy expansion beyond owned K5 |

## Unresolved

- K8 candidate `fc33b4fa` still mandatory branch/org until K8 ships revision.
- K2 current DTO uses `receivingBranchId` in list row — must realign with principal + optional meta.
- Full section acceptance blocked on G1–G5 + DB user confirmation.
