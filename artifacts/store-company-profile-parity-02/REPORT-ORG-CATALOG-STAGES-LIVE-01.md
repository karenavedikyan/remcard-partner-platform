# ORG-CATALOG-STAGES-LIVE-01

Parent tips (turn start):

| Repo | SHA |
|------|-----|
| F remcard-partner-platform | `63b33495d6307602054b8b7d19381d2e1dcf0eaa` |
| B remcard-navigator | `a677ae90c61f6212057b0e8f693530bce19811ce` |

## Реализовано (код, без применения SQL)

### Schema + migration file only

- `Organization.catalogNavigatorStageIds String[] @default([])` in `prisma/schema.prisma`
- File: `prisma/migrations/20261023103000_org_catalog_navigator_stage_ids/migration.sql`
- SHA256: `7e6394de73cdf92cb0bbb033fdfdaaa3536a0b75e335d9e45df22c996dc70635`
- SQL: `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "catalogNavigatorStageIds" TEXT[] NOT NULL DEFAULT '{}';`
- **NOT applied** to any database (no migrate dev/deploy/reset, db push, seed, backfill).

### Affected reads/writes (B)

| Area | Change |
|------|--------|
| Owner PATCH `/api/pro/organization` | `navigatorStageIds` → draft JSON only; rejects `catalogNavigatorStageIds` body; invalid type → 400; PENDING → 409 |
| Owner GET `/api/pro/profile` | `publicNavigatorStageIds` effective overlay; `catalogNavigatorStageIdsLive` |
| Submit `/api/pro/organization/submit-for-moderation` | snapshot includes normalized stages |
| Approve `buildOrgApproveUpdate` | live from frozen `catalogUnderReview`; legacy missing key preserves live |
| `orgLiveCatalogFields` / moderation snapshots | live stages from column; draft overlay normalized |
| Public `/api/catalog` org+branch lists | `navigatorStageId` filter uses org `catalogNavigatorStageIds` (`has`) |
| Public `/api/catalog/org/[orgId]` | returns live `catalogNavigatorStageIds` only |

Meta unchanged: `catalogTouched`, `publicCatalogBranchId` pending rules (turn94).

### Frontend (F)

- `profile-org-catalog-stages-hydration.ts`: draft key vs live; `catalogNavigatorStageIdsLive` on types
- Turn94 pin/draft/picker behavior retained (no rework)

### Tests (mock/offline)

- B: `orgCatalogStagesLive.contract.test.ts`, extended PATCH meta (14 cases), `orgCatalogNavigatorStages.test.ts`
- F: updated hydration tests (+1 scenario)

### Builds / vitest

- B `npm run build`: OK (after `prisma generate` only)
- F `npm run build`: OK
- F full: **486 pass / 9 fail** (same 9 baseline failures; +1 new pass)
- B targeted stage contract + PATCH: **26 pass**

## Deploy blocker (explicit)

**This branch MUST NOT ship on a DB without migration `20261023103000_org_catalog_navigator_stage_ids`.** No JSON-live fallback or feature flag was added.

## Legacy / filter semantics

- Existing rows: default `[]` = not classified for any stage; **does not** match stage-filtered catalog queries.
- Branches inherit org live list (no branch-level stage column).
- No auto-copy from User/working stages; no demo backfill.

## Mock limits

- Approve/reject/DB integration paths verified via pure helpers + PATCH handler mocks; no live PostgreSQL.

## Visual ref+impl (02.4 carryover)

**Not completed in this turn** — no new ref+impl manifest commit. UI parity evidence remains open.

## Tips after commit

| Repo | Parent (turn start) | Tip (LIVE-01) |
|------|---------------------|---------------|
| F remcard-partner-platform | `63b33495d6307602054b8b7d19381d2e1dcf0eaa` | `9632336154d6b3d1257c4ec23121ef9273618291` (LIVE-01 code commit `969f6545326118751e7217bddb18d55faa6d9bf3`) |
| B remcard-navigator | `a677ae90c61f6212057b0e8f693530bce19811ce` | `1742b562bba876cc72bdbcf4e40350faf4e13008` |

### F vitest baseline failures (unchanged, not fixed in LIVE-01)

1. `profile-overview-display > staff CLIENT without partnerType shows organization, not MASTER`
2. `ProfileEditor > legacy production areas: equivalent separators stay clean; edit and revert dirty cycle`
3. `ProfileEditor > after save with legacy areas GET stays clean`
4. `ProfileEditor > allows saving basics while catalog publication is pending review`
5. `ProfileEditor > preserves unsaved basics input when switching sections`
6. `ProfileEditor > warns before leaving basics with unsaved changes and keeps input when cancelled`
7. `ProfileEditor > does not warn when leaving basics after save`
8. `ProfileEditor > keeps unsaved name when initial prop is rerendered with new object`
9. `ProfileEditor > resets form when signed-in user changes`

## Changed files (this turn)

**B:** `prisma/schema.prisma`, `prisma/migrations/20261023103000_org_catalog_navigator_stage_ids/migration.sql`, `catalogPublicationLifecycle.ts`, `orgCatalogNavigatorStages.ts`, `organization/route.ts`, `profile/route.ts`, `catalog/route.ts`, `catalog/org/[orgId]/route.ts`, tests listed above.

**F:** `profile-org-catalog-stages-hydration.ts`, `profile-org-catalog-stages-hydration.test.ts`, `types.ts`, this report.

## Confirmation

- Migration **not applied** anywhere
- No PR/merge/release, no env/production/data changes
