# Migration and release (ADMIN-TEST-01.1)

## Controlled runner

```bash
cd remcard-navigator
export DATABASE_URL=postgresql://…/remcard_prof_test   # loopback only unless operator policy extended

node scripts/prof-admin-migrate.mjs --phase=before
node scripts/prof-admin-migrate.mjs --phase=apply        # dry-run
node scripts/prof-admin-migrate.mjs --phase=apply --apply
node scripts/prof-admin-migrate.mjs --phase=after
```

## Checksums (SHA256 of `migration.sql`)

| Migration | SHA256 |
|-----------|--------|
| `20261015103000_admin_test_01` | `cfade237b2b2f93f42399eca6d9495f4f13099b7121bc40c6efd535bef1af4fa` |
| `20261015200000_admin_test_01_1` | `bce02cecc16ba667f0c485cab436e45e5008f4fc209ecb6b61abba24136b72a1` |

Ledger-aware apply skips finished migrations; re-apply without ledger row will refuse duplicate `ADD CONSTRAINT` (by design).

## Bootstrap

**Local disposable PG (unchanged guard):**

```bash
tsx scripts/prof-admin-bootstrap-credential.ts --user=<staffAdminUserId>
tsx scripts/prof-admin-bootstrap-credential.ts --user=<staffAdminUserId> --apply
```

**Operator production path (reviewed, no auto-promotion):**

```bash
export PROF_ADMIN_BOOTSTRAP_ALLOW_PRODUCTION=1
export PROF_ADMIN_BOOTSTRAP_EXPECTED_HOST=<host>
export PROF_ADMIN_BOOTSTRAP_EXPECTED_DB=<dbname>
tsx scripts/prof-admin-bootstrap-credential.ts --user=<id> --operator-production --apply
```

Password via hidden stdin only; revokes open delegations and bumps `tokenVersion` on apply.

## Flags (default off)

- `PROF_ADMIN_PASSWORD_LOGIN_ENABLED`
- `PROF_ADMIN_TEST_USERS_ENABLED`

Rollback: flags off → endpoints 404/disabled; revoke delegations; prior deploy restore.
