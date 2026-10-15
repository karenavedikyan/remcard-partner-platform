# ADMIN-TEST-01.1 — corrective RC (same PRs)

**Date:** 2026-10-15  
**Verdict:** Blockers from NO-GO review addressed in code; **full browser/PG lifecycle still required** before production enable.

## PRs / branch

| Part | PR | Branch | Base |
|------|-----|--------|------|
| Backend | [navigator #679](https://github.com/karenavedikyan/remcard-navigator/pull/679) | `cursor/admin-test-01-b3e3` | `f68a966173b2f28aaca2537a834a1fb246f76703` |
| Frontend | [platform #13](https://github.com/karenavedikyan/remcard-partner-platform/pull/13) | `cursor/admin-test-01-b3e3` | `7c1e435f3af2128038aee005d5576f01e47c037f` |

Replace `backendHead` / `frontendHead` in `TEST-RESULTS.json` with exact SHAs after merge preview (see git tip of branch).

## Fixed in 01.1

1. **HTTP bodies:** object payloads; backend JSON object validation; no implicit default agent on malformed create.
2. **Isolation:** fail-closed allowlist + `proAuth` test principal gate; catalog filter.
3. **Return:** slot bound to delegation/test user; atomic consume + revoke; admin tokenVersion check.
4. **disable:** `isProfTestUser` scope; 404 for real user id.
5. **Admin auth:** 12h session; dual IP/login durable rate limits; password change UI + revoke.
6. **Migration/bootstrap:** `prof-admin-migrate.mjs` before/apply/after + checksums; production operator bootstrap path.
7. **UX:** admin shell link, filters, password page, flag-off admin login guard.

## Verified this run

- `pnpm build` navigator, `npm run build` platform.
- Unit: admin password, profAdminRequestBody, profTestRoutePolicy, prof-admin-api serialization.
- Migration `--phase=before` on loopback `remcard_prof_test`.

## Not claimed PASS

- End-to-end browser login/create/enter/R02/return/reset/disable with flags on.
- Exhaustive cron/outbox negative matrix.
- Production deploy.

See `TEST-RESULTS.json`, `AUTH-AND-TEST-ISOLATION.md`, `MIGRATION-AND-RELEASE.md`, `USER-GUIDE.md`.
