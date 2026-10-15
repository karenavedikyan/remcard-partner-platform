# Migration and release (ADMIN-TEST-01.2)

## Local disposable (loopback allowlist)

```bash
cd remcard-navigator
export DATABASE_URL=postgresql://…/remcard_admin_test_012
export DIRECT_URL="$DATABASE_URL"

node scripts/prof-admin-migrate.mjs --phase=before
node scripts/prof-admin-migrate.mjs --phase=apply        # dry-run
node scripts/prof-admin-migrate.mjs --phase=apply --apply
node scripts/prof-admin-migrate.mjs --phase=after
```

Pinned SHA256 (manifest authoritative — runner refuses file/manifest drift):

| Migration | SHA256 |
|-----------|--------|
| `20261015103000_admin_test_01` | `cfade237b2b2f93f42399eca6d9495f4f13099b7121bc40c6efd535bef1af4fa` |
| `20261015200000_admin_test_01_1` | `bce02cecc16ba667f0c485cab436e45e5008f4fc209ecb6b61abba24136b72a1` |

Integration: `pnpm test:admin-test-migrate`

## Reviewed production target (connect policy only — do not apply from agent)

```bash
export DATABASE_URL=postgresql://…@192.168.0.4:5432/remcard
export DIRECT_URL="$DATABASE_URL"
export PROF_ADMIN_MIGRATE_ALLOW_PRODUCTION=1
export PROF_ADMIN_MIGRATE_EXPECTED_HOST=192.168.0.4
export PROF_ADMIN_MIGRATE_EXPECTED_PORT=5432
export PROF_ADMIN_MIGRATE_EXPECTED_DB=remcard

node scripts/prof-admin-migrate.mjs --operator-production --phase=before
# apply only after operator sign-off; never run --apply on production from CI/agent
```

`before` is read-only: post-R02 probes, ledger checksum match, refuses untracked/partial ADMIN-TEST objects and unfinished migrations.

## HTTP lifecycle evidence (disposable PG)

```bash
# Backend (example)
export PORT=3010 JWT_SECRET=… DATABASE_URL=…/remcard_admin_test_012 \
  PROF_ADMIN_PASSWORD_LOGIN_ENABLED=1 PROF_ADMIN_TEST_USERS_ENABLED=1
pnpm dev

npx tsx scripts/admin-test-012-lifecycle.ts
# writes partner-platform artifacts/.../e2e-lifecycle-http.json
```

## Bootstrap (unchanged local guard + operator production)

See ADMIN-TEST-01.1 USER-GUIDE; production requires `PROF_ADMIN_BOOTSTRAP_ALLOW_PRODUCTION=1` and expected host/db/port.
