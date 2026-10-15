# ADMIN-TEST-01 RC

## Base / branches

| Repo | Release base SHA | Branch |
|------|------------------|--------|
| remcard-navigator | `f68a966173b2f28aaca2537a834a1fb246f76703` | `cursor/admin-test-01-b3e3` |
| remcard-partner-platform | `7c1e435f3af2128038aee005d5576f01e47c037f` | `cursor/admin-test-01-b3e3` |

Release tips matched origin at run start (R02 merged into release branches).

| Repo | RC commit |
|------|-----------|
| remcard-navigator | `d5400c5b` → PR #679 |
| remcard-partner-platform | `9f7fa98` → PR (draft) |

## Delivered (RC)

- Admin password login (staff ADMIN/OWNER only), feature flag `PROF_ADMIN_PASSWORD_LOGIN_ENABLED` (default off).
- `/login` tabs: MAX/Telegram + «Вход администратора» when capability enabled.
- `/admin/test-users` — create/list/enter/return/reset/disable test partners.
- Test delegation JWT claim + `remcard-admin-return` cookie (admin token not exposed to JS).
- `isProfTestUser` marker (server-only create); scrypt credentials; rate limit by IP+login.
- Bootstrap CLI: `scripts/prof-admin-bootstrap-credential.ts` (stdin password, `--apply`, loopback DB guard).
- BFF allowlist + admin return cookie forwarding.
- Test mode banner in PROF cabinet.

## NOT VERIFIED (this run)

- Full browser e2e on disposable PG with seeded staff admin (requires local flags + migration apply + bootstrap).
- Exhaustive cron/outbox audit for all outbound senders (enforcement map documents intended blocks; negative matrix partially covered by unit tests only).
- Production Timeweb / prof.remcard.ru deploy.

## Blockers for enable on production

1. Apply migration `20261015103000_admin_test_01` via controlled CLI on target DB.
2. Set flags only after review: `PROF_ADMIN_PASSWORD_LOGIN_ENABLED`, `PROF_ADMIN_TEST_USERS_ENABLED`.
3. Bootstrap credential via operator CLI (no env/git passwords).

Production smoke: **NOT RUN**. Merge/deploy: **NOT RUN**.

See sibling repo `artifacts/remcard-admin-test-01/` on navigator for backend migration checksum.
