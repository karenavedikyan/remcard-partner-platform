# П6 — Receiving principal identity (Root source correction, 2026-11-13)

**Supersedes:** blanket `receivingPartnerId = Branch.id` in earlier K8 drafts.

## Canonical model (coordinate K8 / K1 / P2)

| Field | Required | Semantics |
|-------|----------|-----------|
| `receivingPartnerUserId` | yes | Trusted receiving owner **User.id** (`requireOwnerClientsContext`) |
| `receivingPartnerId` | wire alias | Same User.id as prototype `PARTNERS` / `partnerSettings[partnerId]` keys |
| `receivingOrganizationId` | optional | Business org scope when principal has owned org |
| `receivingBranchId` | optional | Branch metadata when exists — **not** receiver identity |

**Solo R06 specialist** (no owned `Organization`, no employment): org/branch **null** — list + mutations still allowed for owner principal; UI must not hide receiving tab.

**Agent:** observer-only; receiving routes reject.

**Org-workplace employee:** list context may resolve **authorized owner User.id** for CRM reads — **never** treat proxy owner as personal observer viewer; write 403 unchanged.

## Active certificate slot (prototype)

- `isReceivingAppealActive`: inactive only `sys_refused` / `sys_return` (see `RECEIVING_SYSTEM_STAGE`).
- `findActiveReceivingAppeal(cert, receivingPartnerUserId)` — prototype `findActiveAppeal`; **UI archive/trash bucket does not deactivate** for uniqueness (K8 must align lifecycle before archive duplicates active referral).

## API surfaces

- `GET /api/pro/client-appeals` → `principal` + rows with `receivingPartnerUserId`.
- Settings persistence keyed by `receivingPartnerUserId` (prototype `partnerSettings`).

## Observer (P2 / K2)

- `ObserverPartnerMeta.id` = receiving partner **User.id** for grouping/display.
- `ObserverReferredAppeal.receivingPartnerUserId` preferred; `receivingPartnerId` legacy alias.

## Owners

| Piece | Owner |
|-------|-------|
| Additive schema / migration | K8 only — **not applied** without user DB OK |
| Route guards + DTO emission | K1 |
| Observer GET shapes | K2 |
| Typed consumer (this branch) | П6 `receiving-appeals-api.ts`, P2 matrix sync |

**No:** org backfill, dummy branch ids, gate expansion, or `canManageLeads` → receiving write inference.
