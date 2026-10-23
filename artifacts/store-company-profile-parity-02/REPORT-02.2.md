# STORE-COMPANY-PROFILE-PARITY-02.2

Branch: `feat/store-company-profile-parity-02` (F + B worktrees). Home turn88 bases unchanged.

## Fixes

### Stable public catalog branch (B)
- `resolvePublicCatalogBranch(branches, pinnedId)` — pinned id from org `catalogDraft.publicCatalogBranchId`, else stable **id asc** (not city sort).
- GET `/api/pro/profile` reads pin from org catalog draft meta.
- PATCH `/api/pro/organization` accepts `publicCatalogBranchId`, validates branch belongs to org, merges into catalog draft meta.

### Conditional branch city PATCH (F)
- `persistCatalogDraftOnly`: PATCH branch `{ city }` only when `catalogTouched.catalogCity`, branch id present, and city differs from `publicCatalogCity`.
- Org PATCH sends `publicCatalogBranchId` when user explicitly saves catalog city (pins branch).

### Copy (F)
- `BusinessTeamPrerequisite`: removed SOLO jargon from no-org hint.

### TypeScript (B)
- `orgPublicCatalogGeography.test.ts`: fixture trimmed to `Pick<Branch,'city'|'catalogDraft'>` — **TS2353 cleared** (no production type widening).

## Tests added/updated

| Area | Command | Result |
|------|---------|--------|
| B geography | `vitest run src/lib/__tests__/orgPublicCatalogGeography.test.ts` | 3 pass |
| B GET organization | `vitest run …/organization/__tests__/route.get.prof-test.test.ts` | 3 pass |
| B GET invites | `vitest run …/invites/__tests__/route.get.prof-test*.ts` | 6 pass |
| F catalog city save | `vitest run src/lib/profile-save.org-catalog-city.test.ts` | 5 pass |
| F full suite | `npx vitest run` @ F tip | **476 pass / 9 fail** (same 9 as baseline `1abf5bd`; +3 net from new city tests) |

## Builds

| App | Command | Result |
|-----|---------|--------|
| F | `npm run build` @ worktree | OK |
| B | `npm run build` @ worktree | OK |

Backend `pnpm exec tsc --noEmit --incremental false`: no diagnostics in `orgPublicCatalogGeography.test.ts`; other repo diagnostics unchanged (not attributed to this turn).

## Visual normal-state evidence (F)

Mechanism: Playwright via existing dev dependency; dev server `PORT=3022 npm run dev`; fixture route `/profile/dev-fixture`.

- **Prototype reference SHA**: `9bc52fb9152293e992e98dc50804a660cef10733` (manifest field; side-by-side diff not in scope this run).
- **Implementation SHA**: recorded in `visual/manifest.json` at capture time.
- **Roles**: STORE, COMPANY (`?partnerType=`).
- **Sections**: overview, basics, catalog, catalog-pending (`moderation=1`), team.
- **Viewports/themes**: 1440×900, 375×812, 320×900 × light/dark.
- **Output**: `artifacts/store-company-profile-parity-02/visual/*.png` + `manifest.json`.

No-org full-shell screenshot still requires a dedicated fixture route (dev-fixture always includes org); team prerequisite copy verified in component test surface only.

## Commits

(Pushed tips recorded after `git push`.)
