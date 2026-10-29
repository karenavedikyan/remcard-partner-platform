# SHARED-CHANGE-REQUEST — partners-prototype-v1 (post independent review)

Owner of shared files: type agent `bc-6cb74748-26bd-44fd-ae54-da856527f81b`  
(search/route.ts, canonical contracts/helpers, FE `src/lib/types.ts`).  
This task branch does **not** edit those files in parallel.

## Dependencies for shared owner

### 1. Canonical search predicates (BLOCKING for facets/cards/list parity)
**Files (shared):** `src/app/api/partnership/search/route.ts`, `src/lib/partnershipSearchQuery.ts`, `src/lib/partnershipSearchFacets.ts`, canonical partner-kind helpers.

**Problem:** search/facets still use raw `partnerType` + `has AGENT`, so e.g. `COMPANY+[STORE,AGENT]` matches both `agent` and `company` filters while canonical UI kind is `company`.

**Required:** one canonical primary-kind predicate for:
- search where
- facet full matching set (keep counting over full set + pagination)
- organization-derived type when applicable

Preserve facets-over-full-matching-set and cursor pagination when resolving merge with type branch `af8959ee`.

**FE already aligned locally:** own-list `resolvePublicPartnerType` now uses `adaptPartnerPrimaryKind` → `resolvePartnerKindUi` (COMPANY+[STORE,AGENT] → company). Do not replace with card-only adapter predicates.

### 2. FE `src/lib/types.ts` merge conflict
All-three FE snapshot reported duplicate incompatible `partnerActivities` (`string[] | undefined` vs `string[] | null | undefined`). Shared owner must unify once — partners branch only used additive optional fields previously.

### 3. Not requested here
Auth/registration/nav/Prisma migrations/admin — out of scope.

## Local partners-branch additive (already done, non-shared)
- Invite `note` carries review conditions for empty/custom paths
- Published numeric + reciprocal `ownTerms` also persist in `note` (without duplicating terms[])
- Link wizard unified for all four audiences
- Certificate error status not overwritten to empty; loading ≠ confirmed empty; retry sequence-guarded
- Discussion subject max 500 UTF-16 without lone surrogates
- `partnershipId` / `terms` deep-link opens invitations segment **and** the authorized detail row (paged)

## Integration base refresh
After partners FE product HEAD `00520dd3b0fe57b2d89efe822d54b540717fbfb1` (tip/docs may follow), type agent must refresh the three-head integration bases to include this tip. Do not cherry-pick into foreign branches without a separate command.
