# ADMIN-TEST-01.2 — targeted acceptance

**Date:** 2026-10-15  
**Branch:** `cursor/admin-test-01-b3e3` (PRs [#679](https://github.com/karenavedikyan/remcard-navigator/pull/679) / [#13](https://github.com/karenavedikyan/remcard-partner-platform/pull/13))

| Repo | HEAD |
|------|------|
| remcard-navigator | `f027f49e8099fa7988dfe9cabc56e066a250d552` |
| remcard-partner-platform | `ca948d7` (see `git log -1` on branch) |

## Closed in 01.2

1. **Migration:** pinned manifest checksums; `--operator-production` with expected host/db/port; read-only `before` refuses untracked partial schema; integration tests on `remcard_admin_test_012` (strip→apply→after→idempotent).
2. **Auth boundaries:** `verifySessionFromRequest` on `/api/auth/me`, `getServerUser`, consent withdraw; return-slot `adminTokenVersion`; upload removed from test allowlist (public upload documented separately).
3. **Reset / limiter / bootstrap:** partnership contact fields in reset; admin rate-limit 503 fail-closed; bootstrap TTY-safe read + blocked admin reject + `finally` disconnect.
4. **Evidence:** HTTP lifecycle JSON on disposable PG; login screenshots 1440/375/320; builds PASS.

## Still NOT VERIFIED (NO-GO for production enable)

- Full browser path: consent/readiness UX → R02 draft/finish → fresh GET → reset partnershipContact proof → disable → password-change UI.
- Production migration `apply` on `192.168.0.4` (policy-only validation in agent run).
- Exhaustive cron/outbox matrix.

See `TEST-RESULTS.json`, `e2e-lifecycle-http.json`, `MIGRATION-AND-RELEASE.md`.
