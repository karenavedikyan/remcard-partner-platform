# Receiving principal identity — P4 UI contract (coordination for K8)

**Root correction (2026-11-13):** retract `receivingPartnerId = Branch.id` for NEW appeals.

## Canonical identity (NEW tables only)

| Field | Rule |
| --- | --- |
| `receivingPartnerUserId` | **Required.** Trusted receiving principal `User.id` (prototype `receivingPartnerId` / `partnerSettings[receivingPartnerId]`). |
| `receivingOrganizationId` | Optional metadata/scope when principal has owned org. **No dummy org for solo specialist.** |
| `receivingBranchId` | Optional workplace scope when it exists. Solo eligible specialist via `requireOwnerClientsContext` may have **neither**. |

## Eligibility (read-only prod facts — K8 must not invent employment org)

- Solo specialist eligible **only without** owned `Organization` (`ownedOrg` ⇒ ineligible `org_owner`); see navigator `specialistR06Eligibility.ts` + `requireOwnerClientsContext` (Root source read).
- **Agent:** observer-only; receiving CRM forbidden.
- Org-workplace proxy owner for CRM reads **must not** become personal observer `viewerUserId` (write 403 pattern unchanged).

## Partner UI consequences (P4 owned)

1. Observer partner cards/detail label by **receiving user display profile**, not branch id.
2. `appeal.receivingPartnerId` in current parity types = **opaque key until P2 maps** to `receivingPartnerUserId`; P2 adapter owns rename — P4 accepts `ObserverPartnerMeta.id` as that principal key.
3. Receiving/detail/history components **do not require** org/branch to render; optional scope lines when present in wire DTO.
4. Active slot predicate for K8: prototype `isActiveAppeal` — only `refused`/`return` inactive; archive/trash bucket is UI overlay (observer-personal-list), **not** inactive for certificate uniqueness unless K8 defines lifecycle explicitly.

## Owners

| Owner | Action |
| --- | --- |
| **K8** | Revise additive schema + `contract.ts`: required `receivingPartnerUserId`, optional org/branch; settings keyed by user id; `isActiveAppeal` query |
| **K1** | Remove soloOwnerReceivingScope that **requires** owned org |
| **K2** | Observer by-partner groups by `receivingPartnerUserId`; partner meta from profile |
| **P2** | Proxy DTO + map legacy `receivingPartnerId` field to user id |
| **P4** | `detail-contract-alignment.ts` mirror (this commit) |

No migration apply / no deploy.
