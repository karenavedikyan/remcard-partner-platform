# R06 specialist release prep — operator runbook (NOT production-ready)

This document prepares a **controlled** production migration procedure. It does **not** authorize production execution. All operator steps below require independent human acceptance and real preflight on the target.

## Scope

- Three pinned SQL migrations only (navigator repo):
  - `20261017123000_prof_r06_specialist_profile` → `66ab4be91d68130812f721dd2c60e0f191e529fdb32473a5bf28d4fddaf1cfdc`
  - `20261017140000_prof_r06_1_specialist_fields` → `1edc45e087aabb9c397a69672ef2e5669bb6654ba3ad50fbb5ad281cf77d0589`
  - `20261017180000_prof_r06_taxonomy_proposal` → `726f239523a35db4e1d008b4a57ba4c6736faa96007194e93f7f7761911a802a`
- Feature gate `PROF_R06_SPECIALIST_PROFILE_ENABLED` defaults **OFF** (global for all eligible specialists, not a single-account canary).
- Taxonomy proposals persist separately (`live` / `prof_test` queues). No canonical auto-add or moderation UI in this release.

## Production facts (must be verified by operator — NOT_VERIFIED here)

| Item | Status |
|------|--------|
| Confirmed backup / restore point | **NOT_VERIFIED** |
| Maintenance window approved | **NOT_VERIFIED** |
| Production navigator SHA / BUILD_ID at cutover | **NOT_VERIFIED** |
| Production platform SHA / BUILD_ID at cutover | **NOT_VERIFIED** |
| Rollback application refs | **NOT_VERIFIED** |
| Rollback schema strategy | **No down migration** — forward-only |

## CLI entrypoints (navigator)

Read-only preflight (never writes):

```bash
node scripts/prof-r06-release-migrate-preflight.mjs --mode=operator-readonly
```

Explicit apply (writes SQL + `_prisma_migrations` ledger):

```bash
node scripts/prof-r06-release-migrate-apply.mjs --mode=operator-apply --apply
```

### Required environment (operator modes)

- `DATABASE_URL` and `DIRECT_URL` must identify the **same** database (no query string, no URL fragment).
- `PROF_R06_EXPECTED_DB_HOST`, `PROF_R06_EXPECTED_DB_NAME`, `PROF_R06_EXPECTED_DB_PORT` must match parsed URL **and** effective PostgreSQL session (`current_database()`).
- Apply additionally requires `PROF_R06_OPERATOR_APPLY_OPT_IN=yes` and `--apply`.

Logs intentionally omit credentials / full DSN.

### Fail-closed behaviors

- Partial/orphan R06 schema without ledger → **STOP**
- Ledger checksum mismatch for any of the three migrations → **STOP**
- Pending list contains only the three R06 migrations (no opportunistic apply of other Prisma migrations)
- No automatic repair, `db push`, ledger rewrite, or backup creation from code

Disposable rehearsal uses `--mode=local-test` on loopback allowlisted DBs (`remcard_r01_test`, `remcard_prof_test`) via `scripts/r06-release-prep-evidence.mjs`.

## Release order (human-gated)

1. Verified backup + restore point + exact DB target confirmation (**NOT_VERIFIED** in this prep).
2. Operator read-only preflight on production target (**not executed in this task**).
3. Apply three R06 migrations (operator apply CLI).
4. Deploy backend with `PROF_R06_SPECIALIST_PROFILE_ENABLED` **OFF**.
5. Deploy frontend with gate **OFF**.
6. Separate coordinated flag enable (global gate, not per test user).
7. Limited smoke (auth, MAX/Telegram entry, specialist draft/finish, catalog submit, taxonomy proposal wire).
8. Addressed cleanup of any rehearsal fixtures only.

## Prep branch candidates

See `RELEASE-PREP-01-BASELINES.json` and draft PR descriptions for exact candidate SHAs vs historical visual capture SHAs.
