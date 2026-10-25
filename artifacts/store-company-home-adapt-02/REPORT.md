# STORE-COMPANY-HOME-ADAPT-02 (re-check closure)

## Runtime pair (code commits — full SHA)

| Role | SHA |
|------|-----|
| Frontend | `1dcd79c2b740a91c6bc7d9624ad8f7ba5ac96cf1` |
| Backend | `f3baba9ca2666a569efea16d238ef8ca68e7ee2d` |
| Merge-base FE | `be43ffc8a34088392635fb9e9079b5929369c117` |
| Merge-base BE | `5a2c2a7d9d5c03f2b948626dea2a987daa0422a4` |

**Status: READY** on `feat/store-company-home-adapt-02` (no merge/deploy/SQL/env/deps).

## Final blocker fixes (this revision)

| Item | Fix |
|------|-----|
| Prof-test branch picker | No `PATCH /api/pro/context`; home uses `GET /api/pro/business-home/metrics?branchId=` + `sessionStorage` (`home-branch-preference.ts`) |
| Single branch + stale cookie | Picker shown when `invalid_branch` / `needs_branch` even with one branch |
| Shell E2E 2 branches | `seed-business-home-shell.ts` + delegated owner select A→sales 1, B→0; foreign `branchId` → `invalid_branch` (0 writes) |
| Employees | `deletedAt: null` on both org-member and branch-employee user filters + deleted fixture |
| 401 metrics | `private, no-store` on 401 (matches other responses) |
| Load tests | Real stale race (slow initial resolves after branch select); real `<select>` + retry click |
| Browser CTA | Scanner: heading «Сканер» + «Найти»; company: `team-open-invite-wizard` dialog open, no submit |

## Evidence

| Artifact | Purpose |
|----------|---------|
| `metadata-shell.json` | **Canonical** shell capture SHAs (matches runtime pair above) |
| `visual-shell/` | CabinetShell light/dark 1440/375/320 |
| `shell-gate.json` / `shell-browser-gate.exit` | Gate `0`, failures `[]` |
| `metadata.json` | **Historical** — dev-preview mock only (`be43`/`5a2`); not acceptance |

## Gates (this revision)

| Gate | Result |
|------|--------|
| navigator business-home vitest (unit + PG integration + route integration) | 16 passed |
| partner business-home vitest | 12 passed |
| partner `npm run build` | 0 |
| `shell-browser-gate` | 0 |
| navigator `pnpm exec tsc --noEmit` vs BE base | **52 errors, Δ0** (base and tip both 52 TS diagnostics; non-zero exit with existing baseline debt — not 56 from `5a239b4`) |

## Unchanged (accepted earlier)

Owner adapter (`resolveOwnerBusinessHomeBranch`), strict branch sales (no null OR), NO_ORG vs FORBIDDEN, MSK unit tests, UX-02/catalog/dark scope.
