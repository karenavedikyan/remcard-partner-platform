# STORE-COMPANY-PROFILE-PARITY-02.3

Branch: `feat/store-company-profile-parity-02`. Bases: F `b520f55…`, B `59c073f2…` (02.2). Home turn88 not integrated.

## Blocker fix: `mergeOrgCatalogDraftMeta` (B)

Shallow `{ ...base, ...patch }` replaced the whole `catalogTouched` map before merge. Fixed to merge `catalogTouched` from the prior map and apply `publicCatalogBranchId` explicitly.

**Regression test (actual PATCH handler):** `src/app/api/pro/organization/__tests__/route.patch.catalog-meta.test.ts` — partial touched + pin, pin-only, touched-only, empty touched (400), website-only staged draft, contact clear, PENDING metadata-only, invalid branch id.

## Visual acceptance 02.3 (F)

**Implementation** (`visual-02.3/`, manifest `implSha` = tip at capture):

- URL: `http://127.0.0.1:3022/profile/dev-fixture` in **AppShell** via `DevProfileFixtureChrome` (not standalone PageHeading-only page).
- DTO: `publicCatalogBranchId`, `publicCatalogCity`, catalog publication fields; `?noOrg=1` for team prerequisite.
- Flow: «Редактировать профиль» → 4 basics steps (summary + step0–3); catalog 5 steps + pending + no-org team.
- Viewports: 1440 / 375 / 320 × light/dark (see manifest per file).

**Prototype** `9bc52fb9152293e992e98dc50804a660cef10733`:

- Static server from `scripts/lib/r06-login-entry-prototype-pack.mjs`.
- Automated ref capture **blocked**: post-registration navigation to shell «Профиль» → tab «Основные данные» did not complete in scripted flow (timeout after ~230s; see manifest `refError`). Side-by-side ref PNGs not produced in this turn; impl matrix is complete with correct SHA.

## Verification

| Check | Result |
|-------|--------|
| B PATCH meta tests | 8 pass (handler) |
| B targeted routes + geography | 20 pass (same runner set as 02.2 + patch file) |
| F targeted parity tests | 19 pass (org catalog city/matrix files) |
| F full vitest | **478 pass / 9 fail** (same 9 as baseline `1abf5bd`) |
| B `npm run build` (worktree) | OK |
| F `npm run build` | OK |
| B `pnpm exec tsc --noEmit` | No new diagnostics in touched tests; repo baseline unchanged |

## Tips

| Repo | Tip |
|------|-----|
| remcard-navigator | `c88f6323` |
| remcard-partner-platform | `a3eedde` |
