# PROF-H — progress (fix-pass)

## Git

| Repo | Branch | From | To (fix-pass) |
|------|--------|------|----------------|
| remcard-navigator | `feat/prof-h-profile-redesign` | `022450b5` | **`c4a866ab`** (+ city display fix) |
| remcard-partner-platform | `feat/prof-h-profile-redesign` | `7c38206` | **`cf39471`** |

## Fix-pass checklist (1–8)

| # | Item | Status |
|---|------|--------|
| 1 | Legacy directions/visibility on save | **PASS** — code + `workingProfile.test.ts`; integration **NOT VERIFIED** (DB) |
| 2 | PATCH final-state + primary + search minimum | **PASS** — unit + integration case in skipped suite |
| 3 | Search auth gates + catalog leak | **PASS** — route.auth (4) + integration catalog case skipped |
| 4 | Picker canonical labels + L1 single source | **PASS** — component tests (2) |
| 5 | Activity vs role + pagination | **PASS** — `partnershipSearchQuery` tests + PartnersHub UI |
| 6 | Public catalog immutability | **PASS** (code path); integration **NOT VERIFIED** (DB) |
| 7 | Real API scenario (no false-green) | **PASS** (test design); execution **NOT VERIFIED** (6 skipped) |
| 8 | Vitest suites + browser | Vitest **PASS** (73); browser **NOT VERIFIED** |

## Tests (this run)

| Suite | Count | Exit |
|-------|-------|------|
| platform Vitest component | 73 | 0 |
| platform proxy (node:test) | 228 | 0 |
| navigator `workingProfile` + `partnershipSearchQuery` | 9 | 0 |
| navigator partnership search `route.auth` | 4 | 0 |
| navigator `profH2WorkingProfileRoutes.integration` | 6 | 0 (skipped) |

## NOT VERIFIED

- `profH2WorkingProfileRoutes.integration.test.ts` on live `remcard_prof_test` (PostgreSQL unreachable; apply `20261009_prof_h2_direction_touched_split`).
- Browser 1440/390 with live taxonomy + save/reload/search.
- Full navigator vitest (~1017) — targeted H2 + typecheck/lint only.

## H3

Not started. No PR / deploy / production DB in this pass.
