# ORG-CATALOG-STAGES-LIVE-01.1

Parent tips (turn start):

| Repo | Parent |
|------|--------|
| F remcard-partner-platform | `4db16dc154d6b3d1257c4ec23121ef9273618291` (code `969f6545326118751e7217bddb18d55faa6d9bf3`) |
| B remcard-navigator | `1742b562bba876cc72bdbcf4e40350faf4e13008` |

## Fixes (narrow)

### 1. Frozen-only approve for live stages (B)

`buildOrgApproveUpdate` now calls `orgApproveLiveStageIdsFromSnapshot` with **`catalogUnderReview` snapshot only**, not the mutable `catalogDraft` fallback used for other live columns.

Regression: `live=['L1-1']`, `catalogUnderReview=null`, `catalogDraft={navigatorStageIds:['L1-3']}` → **`catalogNavigatorStageIds` unset** (live A preserved). Snapshot B + draft C still publishes B; legacy snapshot without stage-key unchanged.

### 2. Public read/display chain (B)

| Path | Change |
|------|--------|
| `GET /api/catalog` | `loadOrganizationsForCatalog` selects live column; `mapOrganizationToCatalog` + `mapBranchToCatalog` emit `catalogNavigatorStageIds` |
| `GET /api/catalog/branch/[id]` | org `select` includes `catalogNavigatorStageIds` |
| `OrganizationCatalogClient` / `BranchCatalogClient` | `PublicNavigatorStageBadges` + `navigatorStageLabel` (live org array only; `[]` → no badges) |

No draft/underReview/working fallback in public payloads.

## Migration freeze

Unchanged file + checksum:

- `prisma/migrations/20261023103000_org_catalog_navigator_stage_ids/migration.sql`
- SHA256 `7e6394de73cdf92cb0bbb033fdfdaaa3536a0b75e335d9e45df22c996dc70635`
- **Not applied** anywhere.

## Tests / builds

- B targeted (contract + PATCH + public DTO/UI): **30 pass** in new/extended files; full stage-related set per turn95 baseline **45+ pass** when including geography/PATCH suite
- B `npm run build`: OK (`prisma generate` only)
- F full vitest: **486 pass / 9 fail** (same 9 names as turn94; no F application code in 01.1)

### Baseline F failures (unchanged)

1. `profile-overview-display > staff CLIENT without partnerType shows organization, not MASTER`
2–9. `ProfileEditor >` (legacy areas ×2, pending basics save, unsaved basics navigation ×5)

## Visual ref+impl (profile STORE/COMPANY)

**Partial only — full matrix not closed.**

Attempt (prototype path + impl dev-fixture, no new runner script):

| Frame | Ref | Impl |
|-------|-----|------|
| STORE catalog tab 1440 light | `visual-live-01.1/ref-store-profile-catalog-1440-light.png` | `visual-live-01.1/impl-store-profile-catalog-1440-light.png` |

- Prototype: `9bc52fb9152293e992e98dc50804a660cef10733`, tar SHA256 `382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d`.
- Impl: `http://127.0.0.1:3022/profile/dev-fixture?section=catalog` at capture time (F tip `4db16dc…`).

**Still open:** COMPANY via «Сценарий макета», 4 basics + 5 catalog steps, preview/pending/no-org, 375/320 light/dark, long values, full manifest with code/render SHA per frame. Old `visual-02.3/*` is **not** evidence for current UI.

## Tips after commit

| Repo | Tip (LIVE-01.1) |
|------|-----------------|
| B remcard-navigator | `cadb77e5d1834a6c45f778e49e9f23469eb62b46` |
| F remcard-partner-platform | `12c4665` (docs/visual; app code unchanged) |

## Changed files (01.1)

**B:** `catalogPublicationLifecycle.ts`, `catalog/route.ts`, `catalog/branch/[id]/route.ts`, `OrganizationCatalogClient.tsx`, `BranchCatalogClient.tsx`, `PublicNavigatorStageBadges.tsx`, tests under `api/catalog`, `catalog/org`, `catalog/branch`, `components/catalog`, `orgCatalogStagesLive.contract.test.ts`.

**F:** this report + optional `visual-live-01.1/` captures.

## Confirmation

No SQL/migrate/db push/seed/backfill; no PR/merge/release; deploy still blocked without migration apply. Code review readiness ≠ permission to run SQL or release.
