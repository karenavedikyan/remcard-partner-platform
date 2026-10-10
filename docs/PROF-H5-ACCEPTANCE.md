# PROF-H5 acceptance

Branch: `feat/prof-h-profile-redesign`

| Repo | Base (given) | HEAD (this turn) |
|------|--------------|------------------|
| remcard-navigator | `ceebccc1` | see git log |
| remcard-partner-platform | `80fc5f1` | see git log |

## Commands (this turn)

| Command | Exit | Result |
|---------|------|--------|
| `cd remcard-navigator && pnpm typecheck` | 0 | pass |
| `cd remcard-navigator && pnpm build` | 0 | pass |
| `cd remcard-navigator && pnpm exec vitest run src/lib/__tests__/profH5Team.integration.test.ts` | 0 | 3 passed |
| `cd remcard-navigator && pnpm exec vitest run src/app/api/pro/invites/__tests__/create-invite.test.ts` | 0 | pass |
| `cd remcard-partner-platform && npm run test:proxy` | 0 | 228 passed |
| `cd remcard-partner-platform && npm run build` | 0 | pass |
| `node remcard-partner-platform/scripts/prof-h5-browser-acceptance.mjs` | 0 | stub report only |

DB: `remcard_prof_test` — migration SQL applied manually (`20261010_prof_h5_organization_team`).

## Scenarios A–J

| ID | Description | Status |
|----|-------------|--------|
| A | One link A+B → one user, no C | **PASS** (PG) |
| B | Work API in A/B vs C/other org | **NOT VERIFIED** (store order preview not wired in H5 test) |
| C | «All current» excludes new branch | **NOT VERIFIED** |
| D | Head office without fake branch | **NOT VERIFIED** (PG partial via revoke → SOLO context) |
| E | Remove A add C, B rights kept | **PASS** (PG) |
| F | Security tampering | **NOT VERIFIED** |
| G | Revoke → old session blocked | **PASS** (PG context) |
| H | Invite edge cases | **NOT VERIFIED** |
| I | Legacy BRANCH/SOLO regressions | **PASS** (create-invite unit + unchanged paths) |
| J | Employee without owner profile | **NOT VERIFIED** (browser) |

## Browser 1440 / 390

| Check | Status |
|-------|--------|
| Owner form invite A+B | **NOT VERIFIED** |
| Copy link | **NOT VERIFIED** |
| Employee accept second context | **NOT VERIFIED** |
| Branch switcher | **NOT VERIFIED** |
| Owner changes scope | **NOT VERIFIED** |

Report: `/opt/cursor/artifacts/prof-h5-browser-report.json` (stub until full Playwright stack).

## Artifacts

- Screenshots: not captured this turn (browser NOT VERIFIED).
- JSON: `/opt/cursor/artifacts/prof-h5-browser-report.json`

## Known limits

- `prisma migrate deploy` not baselined on `remcard_prof_test`; SQL applied directly.
- Manager cannot PATCH org-wide team member (owner only); legacy branch invites unchanged.
- Concurrent accept uses DB transaction but no explicit `updateMany` claim (follow-up hardening).
