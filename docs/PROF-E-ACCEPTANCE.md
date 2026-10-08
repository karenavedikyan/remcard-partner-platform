# PROF-E acceptance matrix (agent run)

| Check | Result | Notes |
|-------|--------|-------|
| Unit/component (platform) | **PASS** | 212 proxy + 36 vitest |
| Unit (navigator) | **PASS** | proProfileCompleteness, profCabinetUrls, moderationProfileSubmit |
| Navigator `pnpm typecheck` | **PASS** | |
| Navigator prod build | **PASS** | `NODE_ENV=production` + synthetic INN/OGRN |
| Platform prod build | **PASS** | `NODE_ENV=production` |
| PG full CLIENT→revise→approve→invite | **NOT VERIFIED** | No automated PG script added this turn; manual operator flow on `remcard_prof_test` recommended |
| Browser 1440/390 key cycle | **NOT VERIFIED** | Local `:3000` was 500 in prior run; not re-run E2E this turn |
| Real Telegram/MAX bot delivery | **NOT VERIFIED** | Test notification endpoint + settings UI only; simulated webhook not exercised |

Rollback: revert feature branch commits on both repos; no production migrations in this change set.
