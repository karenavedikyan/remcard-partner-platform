# SHARED-CHANGE-REQUEST — partners-prototype-v1 (continuation)

## Accepted in-task (Computer-разрешённые additive)

### 1. `src/lib/types.ts`
Additive only:
- `PartnerPublishedTerm`, `PartnerSearchFacets`
- `PartnerSearchResult.publishedTerms?`, `partnerActivities?`
- `PartnerSearchResponse.facets?`

Сохранены все прежние поля.

### 2. `vitest.config.ts`
Already includes owned `partners-prototype-v1/*.test.ts` (prior commit).

## Backend (navigator task branch)
Implemented on `feat/partners-prototype-v1-20261029`:
- search facets + publishedTerms
- `requestPartnerTerms` for non-agent empty terms
- INVITED unique-pair replay

## Остальное
Auth / registration / profile / global nav / Prisma migrations — не трогались.
Admin routes / remcard-proxy admin — не трогались.
