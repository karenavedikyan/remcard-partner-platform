# PROF-H — progress (fix-pass)

## Git

| Repo | Branch | From | To (after fix-pass) |
|------|--------|------|---------------------|
| remcard-navigator | `feat/prof-h-profile-redesign` | `d8f287e` | _(commit below)_ |
| remcard-partner-platform | `feat/prof-h-profile-redesign` | `d2ae82f` | _(commit below)_ |

## Fix-pass highlights

1. Legacy: effective directions + diff PATCH; split `workingProduct/ServiceDirectionsTouched`.
2. Primary validation on final state; cabinet/search minimum on server.
3. Search: `assertCabinetProfAccess`, blocked gate, pagination, activity-based type filter.
4. Picker: full taxonomy + local filter; L1 from `navigatorL1Stages.ts`.
5. Integration test creates own users (no m2fix mutation); removed false-green `hasFixtures` assert.

## Tests (this run)

| Suite | Count | Exit |
|-------|-------|------|
| platform Vitest component | 73 | 0 |
| navigator `workingProfile` + `partnershipSearchQuery` | included in vitest | 0 |
| navigator API integration `profH2WorkingProfileRoutes` | 6 cases | **skipped** (DB unreachable) |

## NOT VERIFIED

- `profH2WorkingProfileRoutes.integration.test.ts` on live `remcard_prof_test` (P1001).
- Browser 1440/390 with live taxonomy + save/reload/search.
- Full navigator vitest (1017 tests) — spot + typecheck only in fix-pass window.

## H3

Not started.
