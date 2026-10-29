# Partner primary kind unification — review pass 3 + round2

## Branches and SHAs (task)

| Repo | Branch | Tip (round2) |
|------|--------|----------------|
| remcard-partner-platform | `feat/partner-primary-kind-unify-20261029` | see latest push on branch |
| remcard-navigator | `feat/partner-primary-kind-unify-20261029` | **`dc4f0b07e26f15fa72a586fc66a1147e9d3f74bb`** |

Integration branch (3-way merge): `integration/partner-admin-r1-review-20261029` — BE **`9632721fc8629ef9151487a8aa039c1f24c03b8e`**, FE **`f0215ceb94acf3c488326296d74156cd599e82ce`**.

Prior tips superseded: `ef8be539` / `21eddabe` (pass3 gate), `a140bc8c` / `af8959ee` (pass2).

## Scope

Canonical primary kind (`resolvePartnerKindUi`) across search, finish, audit, list/card. No production deploy, no live registry scan, no partnership side swaps for Seda/ОПТОВИК.

## Round2 fixes (backend)

| Area | Change |
|------|--------|
| `partnerJoinActivities.ts` | Same-kind finish **preserves** STORE/SERVICE/AGENT when resolver still yields chosen kind; agent finish stays pure |
| `partnerPrimaryKindAudit.ts` | Audit uses user `partnerType` + resolver for extras; no destructive normalize on valid multi-flag profiles; `registered_unknown_empty_storage`; unresolved working org ref |
| `partnerPrimaryKindAuditScan.ts` | `byKindPrincipal` (registered_partner only); `organization.findMany` for working org (order-independent); RepeatableRead |

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
- Backend full `tsc` still carries pre-existing baseline debt; no new TS2367 in `partnerJoinActivities` after `feabe87d` / round2.
- Cross-branch integration documented in `INTEGRATION-PATCH.md` and real merge on `integration/partner-admin-r1-review-20261029`.
