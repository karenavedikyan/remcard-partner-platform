# П3 handoff — receiving principal identity (Root correction)

**Date:** 2026-11-13  
**Consumers:** K8 (schema), K1/K2/K5 (routes), P2 (BFF DTO)

## Rule (canonical)

| Wire (K8/K2) | Partner UI `types.ts` | Meaning |
|--------------|----------------------|---------|
| `receivingPartnerUserId` | `ObserverReferredAppeal.receivingPartnerId` | Trusted **receiving principal `User.id`** (prototype `partnerSettings[receivingPartnerId]`) |
| `receivingBranchId` | *(not card key)* | Optional org workplace scope when it exists |
| `receivingOrganizationId` | *(not card key)* | Optional; absent for eligible solo specialist (no owned org) |

**Do not** map card grouping to `Branch.id` as the default identity. Branch may appear only as optional metadata.

## Observer list metadata

`GET /api/pro/referred-appeals` (K2 @ `3c6ccc19`):

```ts
{
  appeals: ClientAppealObserverReadDto[];
  partners: ObserverReceivingPartnerSummary[]; // + receivingPartnerUserId when K8 6f09c23e lands
  personalMeta: Record<string, PersonalMetaProjection | null>;
  page; limit; total; hasMore; empty;
}
```

Legacy `items[]` still parsed during transition.

`receivingPartners[]` side-load (optional):

```ts
receivingPartners: Array<{
  receivingPartnerUserId: string;
  displayName: string;
  city?: string | null;
  category?: string | null;
  receivingBranchId?: string | null;
  receivingOrganizationId?: string | null;
}>;
```

П3 `fetch-observer-appeals.ts` fails load (SERVER) when `total>0` but any appeal lacks a matching partner row with `displayName` — no dummy org/branch ids, no placeholder partners.

## Solo specialist

`requireOwnerClientsContext` / specialist R06: eligible **without** owned `Organization`. Receiving CRM and observer cards must work with **user principal only** until optional branch exists.

## Out of scope (П3)

- Schema/migration edits (K8 only)
- Eligibility changes, org backfill, finance formulas
- Production DB apply

**Integrate dependency:** `observer-personal-api.ts` @ P5 `a7b111d2` (not edited on П3 branch until Root merge).

**Section acceptance:** not claimed.
