# Employee workspace data — frontend report (2026-11-05)

## SHAs

| Repo | Branch | Commit | Notes |
|------|--------|--------|-------|
| remcard-partner-platform | `cursor/remcard-employee-workspace-data-20261105` | **`3aca58eb`** | Base **`02eedc35b5135b1f7ada8a103218ce36b72cd637`** |
| remcard-navigator | `cursor/remcard-employee-workspace-data-20261105` | **not pushed** | Base **`bb7db4ca`** — repo inaccessible from agent VM |

## What changed (frontend)

- Org **partnership read subject** from trusted `proContext.organization.ownerId` — counterparty/terms in `PartnersHub` use principal id, actor stays `user.id`.
- Authorization **mirrors** for list + settlements (`employee-workspace-data/*-auth.ts`) with OPTOVIK/Sergey fixtures in vitest.
- `CabinetShell` skips partnership list fetch when client mirror denies (avoids spurious 403 badge noise); uses org principal for attention count when allowed.
- Settlements page: **`businessHomeNavContextFromPresentation`** for shell/nav; wallet blocked UI from `canViewWallet` mirror (no fetch, no fake zeros).
- Org staff **home empty welcome** when partnership probe returns confirmed empty; 403/error does not show empty state.

## Blocked on backend

Until navigator patch lands (see `BACKEND-PATCH.md`), production Sergey will still get **403** from real `/api/partnership/list` and `/api/pro/wallet/settlements`. Frontend is ready for additive `effectivePermissions` on `/api/pro/context`.

## Verification run

- `npm run build` (platform)
- `pnpm exec vitest run` focused: `src/lib/employee-workspace-data/**/*.test.ts`, `settlements-page-shell.test.ts`, related gates

No production deploy, no DB/migrations, no role elevation for Sergey.
