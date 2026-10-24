# PROF admin moderation — dark contrast hotfix evidence

## Runtime refs (unchanged backend / prior UX-02 baseline)

| Role | SHA |
|------|-----|
| UX-02 published frontend (branch base) | `8b417145ce7c78761e1b86fc833bd28794559da3` |
| Backend (unchanged) | `5a2c2a7d9d5c03f2b948626dea2a987daa0422a4` |
| This hotfix frontend | see `git rev-parse HEAD` on branch `fix/prof-admin-moderation-dark-contrast-01` after evidence commit |

Production was **not** deployed or modified.

## Fix summary

Explicit light/dark foreground, background, and border pairs for organization detail badges (pending, test), queue `badgeTest`, and related status chips. WCAG regression tests in `src/lib/moderation-badge-contrast.*`.

## Harness

Isolated catalog QA on loopback: PG `:55432`, backend `:3421` @ `5a2c2a7d`, PROF `:3420` production build of this branch. Synthetic fixtures via `seed-moderation-fixtures.ts` (no production accounts or real moderation actions).

## Browser evidence

Script: `npx tsx scripts/prof-admin-moderation-dark-contrast/capture-evidence.ts`  
Env: `CATALOG_QA_ROOT=/agent/repos/remcard-navigator/.catalog-qa-isolated`, `PROF_E2E_URL=http://127.0.0.1:3420`

Screenshots: `artifacts/prof-admin-moderation-dark-contrast-01/screenshots/`  
Computed styles: `computed-contrast.json`

## Measured contrast (computed in Chromium, opaque RGB)

| Surface | Theme | Viewport | Foreground | Background | Ratio | AA 4.5:1 |
|---------|-------|----------|------------|------------|-------|----------|
| «На проверке» | light | 1440 | `#78350f` | `#fffbeb` | 8.75:1 | pass |
| «Тестовый партнёр» | light | 1440 | `#92400e` | `#fef3c7` | 6.37:1 | pass |
| «На проверке» | dark | 390 | `#fef3c7` | `#78350f` | 8.15:1 | pass |
| «Тестовый партнёр» | dark | 390 | `#fde68a` | `#92400e` | 5.69:1 | pass |
| «На проверке» | dark | 1440 | `#fef3c7` | `#78350f` | 8.15:1 | pass |
| «Тестовый партнёр» | dark | 1440 | `#fde68a` | `#92400e` | 5.69:1 | pass |

Dark pending/test no longer use light `--ink` on light yellow fills (pre-fix defect).

## Commands and exit codes

| Command | Exit |
|---------|------|
| `npx vitest run` (10 moderation files listed in task) | 0 |
| `npx tsc --noEmit` | 0 |
| `npm run build` | 0 |
| `npx tsx scripts/prof-admin-moderation-dark-contrast/capture-evidence.ts` | 0 |

## Files touched (product)

- `src/app/admin/moderation/organizations/[id]/OrganizationModerationDetail.module.css`
- `src/app/admin/moderation/AdminModeration.module.css`
- `src/app/admin/moderation/partners/[id]/PartnerModerationDetailClient.tsx`
- `src/lib/moderation-badge-contrast.ts`
- `src/lib/moderation-badge-contrast.pairs.ts`
- `src/lib/moderation-badge-contrast.test.ts`
- `vitest.config.ts`

Evidence-only:

- `scripts/prof-admin-moderation-dark-contrast/capture-evidence.ts`
- `artifacts/prof-admin-moderation-dark-contrast-01/**`
