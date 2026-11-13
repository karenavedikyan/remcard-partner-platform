# K8 receiving identity correction — P2 handoff (2026-11-13)

**Evidence:** `remcard-navigator` `src/lib/specialistR06Eligibility.ts` — solo specialist is **ineligible** when `ownedOrg` (`org_owner`), when `employee`, or `employed_view`. Eligible solo specialist has **no owned Organization** and often **no Branch**.

**K8 draft conflict @ `e11f7e59` migration SQL:**

- `PartnerClientAppeal.receivingOrganizationId` NOT NULL + FK `Organization`
- `PartnerClientAppeal.receivingBranchId` NOT NULL + FK `Branch`
- `PartnerClientAppealPartnerSettings.organizationId` @unique
- Partial unique `(certificateId, receivingBranchId)` for active cert slot

→ Receiving CRM for eligible **solo specialist** is **impossible** without fake org/branch.

## P2 retracts

Prior P2 rule **`receivingPartnerId` = `Branch.id` only** — **retracted**. Root confirms prototype `receivingPartnerId` is the **receiving partner principal `User.id`** (solo included).

## Canonical model (K8 sole writer — additive migration only)

| Field | Rule |
|-------|------|
| `receivingPartnerUserId` | **NOT NULL**, FK `User` — trusted receiving principal |
| `receivingOrganizationId` | **optional** — scope when business owner has org |
| `receivingBranchId` | **optional** — scope when branch exists |
| `referrerProUserId` | issuer from certificate; observer list filter |
| Settings row | **`receivingPartnerUserId` @unique** — `partnerSettings[receivingPartnerId]` |

**No** auto-created orgs, dummy ids, client-posted owner ids, or eligibility expansion.

## Gates (unchanged product rules)

- **Observer:** `requireOwnerClientsContext` / principal agent·specialist·business; agent **observer-only** (`principalAgentObserverOnly`).
- **Receiving:** same owner principal authorization; optional bind org/branch only when real for that user.
- **Org workplace CRM:** may resolve owner for **CRM reads**; **never** substitute org list `ownerUserId` as observer personal **viewer** (session user id only).

## Active certificate slot

- Predicate: **`isActiveAppealStage`** — inactive only `sys_refused` \| `sys_return` (K8 `stages.ts` matches prototype comment).
- **GAP-K8-L:** Receiving archive/trash (`archivedAt` / `deletedAt`) vs prototype `findActiveAppeal` (does not mirror receiver archive UI bucket). K8 must align lifecycle before archive allows a second active referral for same certificate.

Target unique constraint: **`(certificateId, receivingPartnerUserId)`** (+ branch dimension in index only when `receivingBranchId` IS NOT NULL) with stage filter matching `isActiveAppealStage` and agreed lifecycle fields.

## Observer list / metadata (K2)

- Group and filter by **`receivingPartnerUserId`**, not mandatory `Branch`.
- `receivingPartners[]` in list JSON: `receivingPartnerUserId`, `displayName`, profile fields; optional org/branch metadata.
- **GAP-K8-M:** Current `GET by-partner/:partnerId` = `receivingBranchId` path segment — wrong for solo principal.

## Partner platform DTO (P2 inventory)

- `ObserverAppealK2WireDto.receivingPartnerUserId` required; org/branch optional.
- `OBSERVER_APPEAL_ADAPTER_MAP.receivingPartnerUserId` → UI `receivingPartnerId`.
- `OBSERVER_PARTNER_META_ADAPTER_MAP` for `receivingPartners[]` → `ObserverPartnerMeta`.

Constants: `CLIENTS_RECEIVING_IDENTITY`, `CLIENTS_ACTIVE_CERTIFICATE_SLOT`, `CLIENTS_PARTNER_SETTINGS_SCOPE` in `contracts.ts`.

## Open gaps for K8

`GAP-K8-J`, `GAP-K8-K`, `GAP-K8-L`, `GAP-K8-M` (+ prior F/G/H). **No DB execute** until Root + user prod approval.

Section acceptance: **BLOCKED** until schema + routes align.
