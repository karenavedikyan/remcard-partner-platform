# STORE-COMPANY-HOME-ADAPT-02 (review blockers — in progress)

## Runtime refs

| Role | SHA | Notes |
|------|-----|--------|
| Frontend base | `be43ffc8a34088392635fb9e9079b5929369c117` | unchanged merge-base |
| Backend base | `5a2c2a7d9d5c03f2b948626dea2a987daa0422a4` | unchanged merge-base |
| **Frontend product (branch tip after blocker fixes)** | see `git rev-parse HEAD` on `feat/store-company-home-adapt-02` after push |
| **Backend product (branch tip)** | see navigator `feat/store-company-home-adapt-02` tip |

**Status: NOT READY** — full CabinetShell synthetic browser matrix (light/dark 1440/375/320, CTA scanner/team) still required for final acceptance.

## Blocker fixes in this revision

1. **Owner branch:** `resolveOwnerBusinessHomeBranch` + `preferredBranchId` from cookie/query; no `activeBranch` reliance; foreign → `invalid_branch`; multi-branch → `needs_branch`; single branch auto-select.
2. **Sales:** only `certificatePartner.branchId === selected` (no null OR inflation).
3. **Employees:** exclude REVOKED org members, blocked users; dedup; owner/pending invites not counted.
4. **GET:** `Cache-Control: private, no-store`; `404` + `code: NO_ORG` vs `403` FORBIDDEN.
5. **Frontend:** branch picker (PATCH `/api/pro/context`), `contextEpoch` reload, partial metric errors, `selectedBranchId` from API.

## Tests run (this revision)

| Suite | Exit |
|-------|------|
| navigator `businessHomeOwnerBranch.test.ts` | 0 |
| navigator `businessHomeMetrics.integration.test.ts` (real getProContext + prisma) | 0 |
| navigator route tests | 0 |
| partner `business-home` gate + presentation | 0 |
| partner `tsc --noEmit` + `npm run build` | 0 |

## Metrics map

See `metrics-map.json` (updated: sales scope strict branchId).

## Not verified yet

- Full-shell Playwright on isolated loopback with real guards (not dev-preview-only).
- Agent/staff/pure-agent page-flow regression beyond unit gate tests.
- MSK midnight boundary E2E (unit MSK period tests still apply).
