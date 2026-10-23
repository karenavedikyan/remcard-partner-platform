# STORE-COMPANY-PROFILE-PARITY-02.1

## Refs (same branches)

| Repo | Parent tip (turn89) | This supplement |
|------|---------------------|-----------------|
| remcard-partner-platform `feat/store-company-profile-parity-02` | `bdc298e7d6a6389d06931089bd4eacd4384e90ef` | _(see git log)_ |
| remcard-navigator `feat/store-company-profile-parity-02` | `515a57c8b95ee5e8ac8deafcf2042b7d44caa632` | _(see git log)_ |

Home turn88 **not** included: F `a8a39e0…` / B `e5f8275…`.

## Fixes

### Catalog city (org + branches)

- **GET /api/pro/profile** exposes `organization.publicCatalogBranchId` + `publicCatalogCity` (primary active branch, draft-aware).
- **profile-draft-sync** hydrates `catalogCity` from `publicCatalogCity` for org entity.
- **persistCatalogDraftOnly** PATCHes ` /api/pro/organization/branches/{id}` with `{ city }` when branches exist; first branch POST unchanged when `branchCount === 0`.
- Tests: `profile-save.org-catalog-city.test.ts`, `profile-draft-sync` hydration case.

### Pending org preview (products)

- `OrganizationCatalogSection` pending uses `SpecialistCatalogPendingView` with `previewVariant="default"` so **productLabels** render for STORE.

### ProfileEditor regressions (3 new → fixed)

- Adapted to 5-step org wizard + business catalog prerequisite; added branch-address case for org without branches.

### Business team no-org

- `BusinessTeamPrerequisite` when STORE/COMPANY owner has no organization (avoids SOLO-invite misleading path).

### Prof-test GET handlers

- Route tests: `organization/__tests__/route.get.prof-test.test.ts`, `invites/__tests__/route.get.prof-test.test.ts`
- Geography helper: `orgPublicCatalogGeography.ts`

## Verification run (this turn)

- Frontend: `profile-save.org-catalog-city`, `OrganizationCatalogPending`, ProfileEditor (4 parity cases), `npm run build` OK
- Navigator: org geography + organization/invites GET route tests (6 tests) via main-repo vitest
- **Full frontend suite / visual 1440×375**: not re-baselined in this turn — see blockers below

## Baseline note (9 legacy failures)

Production-base `1abf5bd` ProfileEditor-related failures outside the 3 adapted cases remain **unchanged by policy** (business wizard replaces legacy basics form in several tests).

## Visual evidence blocker

Full-shell prototype comparison (9bc52fb tar, 1440/375 light/dark) requires running partner dev + navigator with synthetic fixtures; not completed in this supplement turn. Use `/profile/dev-fixture` + existing capture scripts when environment runner is available.
