# PROF-H5 acceptance (store regression + completion)

Branch: `feat/prof-h-profile-redesign`

| Repo | Base (given) | HEAD (this pass) |
|------|--------------|------------------|
| remcard-navigator | `11e83db4` | see git log after push |
| remcard-partner-platform | `33d4c4e` | see git log after push |

## Defect → fix → test → result

| Defect | Fix | Test | Result |
|--------|-----|------|--------|
| `assertContextBranchSelected` blocked ORG_OWNER / SOLO (403 on store) | `assertStorePurchaseBranchContext` + `authorizeStoreOrderMutation` | `profH5StoreOrder` owner order; branch integration owner | **PASS** |
| VIEWER / disabled `canActivateCertificates` could POST order | DB `hasPermission(employee, 'canActivateCertificates')` on preview/order | `profH5StoreOrder` deny cases | **PASS** |
| Multi-branch staff without explicit cookie could purchase | Require `remcard-pro-branch` when `branches.length > 1` | `profH5StoreOrder` A then B cookie | **PASS** |
| Head office without branch ops could reach store gate | HEAD_OFFICE + no branches → 403 at store gate | `profH5StoreOrder` | **PASS** |
| CLIENT employee 403 on order history after purchase | `resolveStoreOrderListAccess` uses cabinet readiness (not `UserRole.PRO` only) | order detail after create in PG | **PASS** |
| Browser invite checked «all current» first | `data-testid=team-invite-branch-{id}` on A/B | `prof-h5-browser-acceptance.mjs` | **PASS** |
| Stale stack / JWT not loaded on `next start` | Clean `.next`, `source .env.local`, `pnpm start` only | browser run | **PASS** |

## Commands (this pass)

| Command | Exit | Result |
|---------|------|--------|
| `pnpm typecheck` (navigator) | 0 | pass |
| `pnpm build` (navigator) | 0 | pass |
| `npm run build` (platform) | 0 | pass |
| `vitest profH5Team.integration.test.ts` | 0 | **12 passed** |
| `vitest profH5StoreOrder.integration.test.ts` | 0 | **2 passed** |
| `vitest route.branch.integration.test.ts` (store) | 0 | **5 passed** (with SELLER permission flags in fixture) |
| `npm run test:proxy` (platform) | 0 | **228 passed** |
| `node scripts/prof-h5-browser-acceptance.mjs` | 0 | **PASS** (1440 + 390) |

Stack for browser: navigator `:3001` + platform `:3000`, `JWT_SECRET` from navigator `.env.local`, fixtures on `remcard_prof_test` only.

## Scenarios A–J

| ID | Status | Evidence |
|----|--------|----------|
| A | **PASS** | `profH5Team.integration.test.ts` — one ORGANIZATION invite → A+B, not C |
| B | **PASS** | `profH5StoreOrder.integration.test.ts` — preview/order owner + seller A/B cookie; deny VIEWER, disabled perm, C, head office, revoke; `profH5Team` context cookie B |
| C | **PASS** | `profH5Team` snapshot excludes new branch; deactivated branch → accept 400, zero rows |
| D | **PASS** | `profH5Team` HEAD_OFFICE, no `BranchEmployee`, GET context ORG_TEAM_MEMBER |
| E | **PASS** | `profH5Team` PATCH A+B → B+C preserves B `id` + `canManageCatalog`; membershipKind-only PATCH keeps branch set |
| F | **PASS** | `profH5Team` non-owner PATCH team → 403 |
| G | **PASS** | `profH5Team` revoke X, pending invite Y stays PENDING; partial branch remove; org revoke → context 403 |
| H | **PASS** | `profH5Team` expired/revoked invite 400; concurrent accept 200+409, one winner; repeat accept idempotent, no notify |
| I | **PASS** | `profH5Team` legacy BRANCH invite; sole manager bulk PATCH → 400 |
| J | **PASS** | `profH5Team` CLIENT accept + GET context 200 (cabinet); browser full accept + profile (not context-only) |

Auth: integration tests use real `createToken` cookies (no auth mocks).

## Browser 1440 / 390

| Step | Status |
|------|--------|
| Owner invite A+B (`team-invite-branch-*`) | **PASS** |
| Local invite URL (token on PROF) | **PASS** |
| Employee accept | **PASS** |
| Branch switch B + reload persistence | **PASS** |
| Owner revoke via UI (`team-member-revoke-org`) | **PASS** |
| Stale employee tab: GET/PATCH `/api/remcard/api/pro/context` → 403 | **PASS** |
| 390 layout overflow | **PASS** |

Report: `/opt/cursor/artifacts/prof-h5-browser-report.json`  
Screenshots: `/opt/cursor/artifacts/screenshots/prof-h5-*.png`  
Trace (on owner invite failure): `/opt/cursor/artifacts/traces/`

Telegram / MAX: **NOT VERIFIED** (by design).

## Key files

- Navigator: `src/lib/proContextRequest.ts`, `src/lib/store/storeOrderAccess.ts`, store order preview/POST routes
- PG: `src/lib/__tests__/profH5Team.integration.test.ts`, `src/lib/__tests__/profH5StoreOrder.integration.test.ts`
- Platform: `scripts/prof-h5-browser-acceptance.mjs`, `ProfileTeamSection` / `ProfileBranchContextSwitcher` test ids
