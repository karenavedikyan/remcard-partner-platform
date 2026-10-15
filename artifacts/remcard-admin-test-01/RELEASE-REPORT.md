# ADMIN-TEST-01.3 — browser + BFF lifecycle gate

**Date:** 2026-10-15  
**Branch:** `cursor/admin-test-01-b3e3` (PRs [#679](https://github.com/karenavedikyan/remcard-navigator/pull/679) / [#13](https://github.com/karenavedikyan/remcard-partner-platform/pull/13))

| Repo | Reviewed code HEAD | Role |
|------|-------------------|------|
| remcard-navigator | `f027f49e8099fa7988dfe9cabc56e066a250d552` | Backend / auth / test users |
| remcard-partner-platform | `8be085809432b3cdcefdf54c37b5631598c36061` | Admin UI / BFF / R02 wizard |

Branch tips may include follow-up commits for acceptance scripts and evidence artifacts only; reviewed application SHAs are unchanged unless a defect fix lands in the same PR.

## Verified in this run (loopback `remcard_admin_test_012` only)

1. **Browser admin path:** `/login?mode=admin` → create AGENT/MASTER/STORE/COMPANY with type check → enter agent → mandatory consent UX (no DB seed bypass) → test banner + agent shell → R02 draft/reload, skip, finish → BFF GET `profileComplete` without draft → return → re-enter → reset scope → disable → admin password change.
2. **Compact negatives:** real-user reset no-op; stale test/admin sessions rejected via `auth/me` (`user: null` / `PROF_TEST_SESSION_INVALID`); return replay 403; partnership invite blocked via BFF.
3. **Evidence:** `browser-lifecycle.json`, screenshots (admin list, banner, profile saved at 1440/375, 320 smoke), `e2e-lifecycle-http.json` (direct HTTP, complementary).

## Still NOT_RUN (by policy)

- Production Timeweb connect / migration `apply` on `192.168.0.4:5432/remcard`
- Production flag enablement, real-admin assignment, merge/deploy
- Full cron/outbox matrix

## Recommendation

**Ready for operator review** of controlled publication (migration + flags + credentials) based on local disposable acceptance. Production steps remain gated until explicit operator sign-off.

See `TEST-RESULTS.json`, `USER-GUIDE.md`, `MIGRATION-AND-RELEASE.md`.
