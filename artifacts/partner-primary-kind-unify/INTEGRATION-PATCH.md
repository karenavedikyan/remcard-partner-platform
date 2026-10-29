# Integration patch: partner kind (type branch) × Partners prototype × Admin R1

Prepared by integration owner for **manual** merge rehearsal — not applied to `main`, `release/*`, or neighbor task branches.

## Basis SHAs (2026-10-29)

| Slice | Repo | Branch | Tip |
|-------|------|--------|-----|
| Canonical kind (this task) | remcard-navigator | `feat/partner-primary-kind-unify-20261029` | see REPORT backend tip |
| Canonical kind (this task) | remcard-partner-platform | `feat/partner-primary-kind-unify-20261029` | see REPORT frontend tip |
| Partners prototype | remcard-navigator | `feat/partners-prototype-v1-20261029` | `c77d15e2a996c80ecc0b9cf766997ae8a2f476b3` |
| Partners prototype FE | remcard-partner-platform | `feat/partners-prototype-v1-20261029` | `bdadace846f03cc016fbd0f5ef806152a4a357fa` (bundle may be newer) |
| Admin R1 | remcard-navigator | `feat/admin-release1-prototype-20261029` | `c1b40cff58a9ea5ab9abebf356b78a50aa128170` |
| Admin R1 FE | remcard-partner-platform | `feat/admin-release1-prototype-20261029` | `0dc97e20499c748b82f24d8853dbdbf5ef8ea78f` |

Re-run `git merge-tree` / local merge if neighbor tips move.

## Backend conflict: `src/app/api/partnership/search/route.ts`

**Symptom:** merge-tree exit 1 between kind tip and `c77d15e2` on this file.

**Resolution policy (keep both):**

1. **From kind branch:** imports `partnershipSearchKindFields`; select includes `partnerActivities`; org select includes `partnerType`; response maps `partnerKind`, `partnerKindLabel`, canonical `partnerTypeLabel`, `organizationPartnerType`.
2. **From Partners branch:** `computePartnershipSearchFacets`, `loadPublishedTermsByPartnerUserIds`, parallel `Promise.all([findMany, facets])`, response `facets` + `publishedTerms` on partners.
3. **Facets must use the same `buildPartnershipSearchWhere` + canonical predicates** (`agentPartnerTypeWhere` → `registryListFilterForPartnerTypeParam`) so facet totals match page filters.
4. **Org snippet:** extend Partners `mapUserWithBranches` typing to require `partnerType?: PartnerType | null` (Partners already has this optional field).

Pseudo-structure after merge:

```typescript
const [candidates, facets] = await Promise.all([
  prisma.user.findMany({ select: { … partnerActivities, organizationsOwned: { select: { name, logoUrl, partnerType, branches } } } }),
  computePartnershipSearchFacets({ where: baseWhere, … }),
]);
// map rows with partnershipSearchKindFields + organizationPartnerType
return NextResponse.json({ partners, facets, nextCursor, hasMore });
```

## Frontend conflict: `src/lib/types.ts` (`PartnerSide` / search types)

**Symptom:** merged snapshot declares `partnerActivities` twice (`string[]` vs `string[] | null`).

**Resolution:** one alias only (already on kind branch):

```typescript
export type PartnerActivitiesList = string[] | null | undefined;
```

Apply to `AuthUser`, `ProfTestSessionInfo`, `ProProfileUser`, `PartnershipUser`, `PartnerSearchResult`, and any Partners `PartnerSide` / discovery types introduced by prototype — **single field, no duplicate property**.

Partners FE may add `PartnerSearchResponse.facets`; extend without redefining `partnerActivities`:

```typescript
export type PartnerSearchResponse = {
  partners: PartnerSearchResult[];
  facets?: …; // from Partners branch
  nextCursor?: string | null;
  hasMore?: boolean;
};
```

## Verification after merge (integration owner)

1. `pnpm exec tsc --noEmit` (platform + navigator).
2. Vitest: kind predicates + `route.dto.test.ts` + Partners facet tests + inverted partnership tests.
3. No change to partnership sides/terms for Seda/ОПТОВИК contracts.

## Live audit

Do **not** run `scripts/partner-primary-kind-audit.ts` against production. Script requires `--allow-live-database-scan` and uses `REPEATABLE READ`; default CLI exits blocked. Use `partnerPrimaryKindAuditScan.test.ts` for synthetic proof.
