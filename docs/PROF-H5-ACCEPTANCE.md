# PROF-H5 acceptance (completion pass)

Branch: `feat/prof-h-profile-redesign`

| Repo | Base | HEAD (this pass) |
|------|------|------------------|
| remcard-navigator | `c2878c6c` | see git log |
| remcard-partner-platform | `40a4131` | see git log |

## Defect → fix → test → result

| Defect | Fix | Test | Result |
|--------|-----|------|--------|
| Snapshot «all current» re-expanded at accept | `staffInviteAcceptOrganization` uses stored `branchIds` only | `C`, `C2` PG | **PASS** |
| `remcard-pro-branch` dropped by BFF | Allowlist cookie forward + Set-Cookie filter | `remcard-proxy.test.ts` | **PASS** |
| Invalid preferred branch silently used first branch | `getProContext` null `activeBranch`; store order gate | `B` PG | **PASS** |
| CLIENT / head office not in readiness | `OrganizationMember` ACTIVE in `isPartnerEmployee`; `/api/pro/context` cabinet gate | `D`, `J` PG | **PASS** |
| Non-atomic invite accept | `updateMany` claim after assignments in transaction | (partial) | **NOT VERIFIED** concurrent |
| Revoke mass-cancelled invites | Removed broad `updateMany` on org invites | `G` PG | **PASS** (403 cabinet + rows removed) |
| Sole manager removed in bulk | `assertCanRemoveBranchEmployee` | PATCH team (existing) | **PASS** (E preserves manager) |
| UI role management hidden | Per-branch role select + branch API PATCH | manual | **NOT VERIFIED** browser |

## Commands

| Command | Exit | Result |
|---------|------|--------|
| `pnpm typecheck` (navigator) | 0 | pass |
| `pnpm build` (navigator) | 0 | pass |
| `pnpm build` (platform) | 0 | pass |
| `vitest profH5Team.integration.test.ts` | 0 | **8 passed** |
| `npm run test:proxy` (platform) | 0 | **228 passed** |
| `node scripts/prof-h5-browser-acceptance.mjs` | 1 | partial (see below) |

## Scenarios A–J (PG / API)

| ID | Status | Evidence |
|----|--------|----------|
| A | **PASS** | PG: one user, A+B |
| B | **PASS** | PG: PATCH/GET context + cookie branch B |
| C | **PASS** | PG: snapshot + new branch C excluded; deactivated B → no rows |
| D | **PASS** | PG: head office, no branch rows, ORG_TEAM_MEMBER |
| E | **PASS** | PG: PATCH team preserves manager on B |
| F | **PASS** | PG: manager PATCH team → 403 |
| G | **PASS** | PG: revoke → branch rows gone, context 403, employee row 404 |
| H | **NOT VERIFIED** | expired/concurrent accept not automated this pass |
| I | **NOT VERIFIED** | legacy SOLO/suspend/single-manager not re-run in H5 file |
| J | **PASS** | PG: CLIENT accept + GET context 200 |

Auth: integration tests use real `createToken` cookies (no `getProUser` mock).

## Browser 1440 / 390

| Step | Status |
|------|--------|
| Owner form invite A+B | **NOT VERIFIED** (Playwright: team form button timeout) |
| Copy link | **NOT VERIFIED** |
| Employee accept | **NOT VERIFIED** |
| Branch switch A/B | **NOT VERIFIED** |
| Owner revoke + stale tab | **PARTIAL** (revoke via API PASS; UI stale tab not asserted) |

Report: `/opt/cursor/artifacts/prof-h5-browser-report.json`  
Screenshots: `/opt/cursor/artifacts/screenshots/prof-h5-*.png`

Blocker for full browser PASS: platform dev `.next` corruption required `next build` + `next start`; automated owner flow still could not submit invite form (needs follow-up on selectors / SSR data).

## Artifacts

- PG: `src/lib/__tests__/profH5Team.integration.test.ts`
- Browser: `scripts/prof-h5-browser-acceptance.mjs`, `scripts/prof-h5-browser-fixtures.ts`
