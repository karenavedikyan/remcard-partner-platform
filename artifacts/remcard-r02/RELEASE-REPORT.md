# RemCard R02.3 RC

## PRs (same branches)

- Backend: https://github.com/karenavedikyan/remcard-navigator/pull/678 (base `release/prof-backend-v1-20261007`)
- Frontend: https://github.com/karenavedikyan/remcard-partner-platform/pull/12 (base `release/prof-v1-20261007`)
- Branch: `cursor/r02-agent-profile-b3e3`

## R02.3 closure (A / B / C)

| Group | Scope | Result |
|-------|--------|--------|
| **A** | Finish lifecycle: `persistDraft` keeps outer busy until `finishAgentProfile` completes (`releaseBusy: false` on final PATCH); generic network error on finish failure; regression tests 5/5 incl. double-submit + reject recovery | **PASS** |
| **B** | Isolated loopback stack (`scripts/r02-local-stack.mjs`), random JWT in `/tmp/r02-local-stack/runtime.env` (not logged/committed), seed/mint fixture, auth chain backend→BFF, CSRF negative, full profile HTTP+Playwright (`r02-local-profile-e2e.mjs`), gate-off legacy HTTP (`r02-gate-off-smoke.mjs`) | **PASS** — evidence: `local-auth-evidence.json`, `profile-e2e-evidence.json` |
| **C** | Reference via `roles.html` agent cabinet; impl on `/profile?section=basics` with cookie; VERIFY before CAPTURED PASS; 6 paired wizard/summary PNG sets + 320 smoke | **PASS** — `artifacts/remcard-r02/screenshots/visual-report.json` exit 0 |

## Backend delta (R02.3)

- Cookie header fallback for API auth: `getTokenFromRequest` + `proAuth` / `auth/me` (BFF/HTTP clients).
- Local fixture: `scripts/r02-local-fixture.ts` (`push-schema`, `seed`, `mint`, `reset-draft`), loopback DB guard.

## Schema / migration (unchanged in R02.3)

- SQL: `prisma/migrations/20261015120000_prof_r02_agent_profile/migration.sql`
- SHA-256: `4f52ccaf51dc4856271c77abbed34af082cdb9f027b230f61a4a235c18221566`
- Controlled apply on disposable PG: **PASS** (same command as R02.2; no new migration audit).

## Production smoke

**NOT RUN** (per R02.3 scope).

## Publication order

Unchanged from R02.2; not executed (no merge/deploy/Timeweb).

See `TEST-RESULTS.json` for exact HEAD SHAs, commands, and exit codes.
