# Migration & controlled release

## Migration

- Path: `remcard-navigator/prisma/migrations/20261015103000_admin_test_01/migration.sql`
- Checksum: compute after apply with team migration ledger (do not `db push` production).

## Order

1. Flags **off** in production.
2. Apply migration (read-only verify → apply → verify tables).
3. Bootstrap one staff ADMIN credential (CLI, stdin).
4. Enable `PROF_ADMIN_PASSWORD_LOGIN_ENABLED=1` on backend + frontend BFF host.
5. Enable `PROF_ADMIN_TEST_USERS_ENABLED=1` when ready for test-user UI.

## Rollback

- Set both flags to `0` / unset.
- Revoke open `ProfTestDelegation` rows (`revokedAt = now()`).
- Do **not** drop tables in hot rollback.

Production credentials: **never** commit or seed in git.
