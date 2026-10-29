# Partner primary kind unification — review pass 3 + round2

## Branches and SHAs (task)

| Repo | Branch | Tip (round2) |
|------|--------|----------------|
| remcard-partner-platform | `feat/partner-primary-kind-unify-20261029` | see latest push on branch |
| remcard-navigator | `feat/partner-primary-kind-unify-20261029` | **`68b79ba7`** (audit scan TS2802/TS2322) |

Integration branch (3-way merge): `integration/partner-admin-r1-review-20261029` — BE **`965d44db`**, FE **`f0215ceb94acf3c488326296d74156cd599e82ce`** (FE head unchanged this round).

Prior tips superseded: `ef8be539` / `21eddabe` (pass3 gate), `a140bc8c` / `af8959ee` (pass2).

## Scope

Canonical primary kind (`resolvePartnerKindUi`) across search, finish, audit, list/card. No production deploy, no live registry scan, no partnership side swaps for Seda/ОПТОВИК.

## Round2 fixes (backend)

| Area | Change |
|------|--------|
| `partnerJoinActivities.ts` | Same-kind finish **preserves** STORE/SERVICE/AGENT when resolver still yields chosen kind; agent finish stays pure |
| `partnerPrimaryKindAudit.ts` | Audit uses user `partnerType` + resolver for extras; no destructive normalize on valid multi-flag profiles; `registered_unknown_empty_storage`; unresolved working org ref |
| `partnerPrimaryKindAuditScan.ts` | `byKindPrincipal` (registered_partner only); `organization.findMany` for working org (order-independent); RepeatableRead; `normalizeProfLiveRegistrationForAudit` + `Array.from(missing)` |
| `partnerLiveRegistration.ts` | `normalizeProfLiveRegistrationForAudit` — nullable Prisma campaign/schema without unsafe cast |

## Registration finish

`mergePartnerActivitiesForJoinFinish` + `profRegistrationJoinFinish` (not blind `freshPartnerActivitiesForJoinKind` replace).

Tests: `partnerJoinActivities.test.ts`, `profRegistrationJoinFinish.service.test.ts` (STORE+SERVICE+AGENT same-kind store).

## Audit / scan CLI

Default **blocked** (no live DB). Synthetic: `pnpm vitest run src/lib/__tests__/partnerPrimaryKindAuditScan.test.ts`.

Live staging only: `--i-acknowledge-read-only` **and** `--allow-live-database-scan`.

Unknown registered empty storage: issue **`registered_unknown_empty_storage`** → manual review (not legacy `unresolved_canonical_kind` tag).

## Tests (agent subset)

Navigator: partnerJoinActivities, partnerPrimaryKindAuditScan (byKindPrincipal + working org lookup), partnerPrimaryKindAudit, finish service mocks, search DTO/facets.

Platform: partner-kind-ui, partner-filters, partnership-search-ui; integration FE tsc/build on `integration/partner-admin-r1-review-20261029`.

## Known limits

- Full production registry not verified.
- Backend full `tsc`: **`pnpm exec tsc --noEmit --incremental false` exit 2, 57 diagnostics** (same count as review baseline `ef8be539…`); **no** TS2802/TS2322 in `partnerPrimaryKindAuditScan.ts` vs pre-fix integration `9632721…` (59 diagnostics, +2 scan-only).
- Cross-branch integration documented in `INTEGRATION-PATCH.md` and real merge on `integration/partner-admin-r1-review-20261029`.
