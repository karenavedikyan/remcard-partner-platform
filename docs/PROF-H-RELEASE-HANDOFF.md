# PROF-H release handoff (H1–H5) — preparation only

**Does not authorize production deploy, migration writes, or publication.**

## 1. Version pins

| Artifact | SHA | Notes |
|----------|-----|--------|
| Navigator **immutable application bundle** | `f900bcf9ac364dbd805a0dfe56253d39da257533` | App + migration SQL (unchanged) |
| Platform **immutable application bundle** | `9a6ab80914e43c2e8a0929ea84a01fa257d01123` | PROF cabinet frontend |
| Navigator **release-safety tooling** | `51a3572f8209380a6d508afc3f11d6b3f93b6ba4` | Preflight/apply/probes/tests — use for operator migrate path |
| Platform **docs handoff** | `dc67fa06789a69a779077d1bb20fc5ee391507a3` | No runtime change |

Release baseline for rehearsal diff: navigator `9523dcd5dc4cd0c69b58152604004a6ed27083be`, platform `bb60c608f8b88c910773ab681060fe0a48673ee9`.

Manifest: `remcard-navigator/docs/PROF-H-RELEASE-MANIFEST.json` at release-safety SHA above.

## 2. Operator A — read-only preflight (no writes)

Use a **read-only** database role. Do not use apply credentials here.

```bash
cd remcard-navigator
git checkout 51a3572f8209380a6d508afc3f11d6b3f93b6ba4

export DATABASE_URL='postgresql://…'   # read-only user, direct connection
export DIRECT_URL='postgresql://…'     # MUST match DATABASE_URL (same host:port/database)
export PROF_H_EXPECTED_DB_HOST='…'
export PROF_H_EXPECTED_DB_NAME='…'

node scripts/prof-h-release-migrate-preflight.mjs --mode=operator-readonly
```

Exit **0** → migration **readiness** check passed (`READY_FOR_OPERATOR_CHECK` in JSON). Exit **1** → **BLOCKED** — do not apply.

Preflight runs in a read-only transaction, probes `public` schema objects for all five PROF-H SQL migrations, audits full migration folder vs ledger (including ledger→disk orphans), and requires matching `DATABASE_URL`/`DIRECT_URL`.

## 3. Operator B — apply (only after backup + separate approval)

Use credentials with **`CREATE`/`ALTER`/`INSERT` on `_prisma_migrations`** (not read-only). Same target database identity as preflight.

```bash
cd remcard-navigator
git checkout 51a3572f8209380a6d508afc3f11d6b3f93b6ba4

export DATABASE_URL='postgresql://…'   # migrate role
export DIRECT_URL='postgresql://…'     # same identity as DATABASE_URL

node scripts/prof-h-release-migrate-apply.mjs --apply --mode=operator-readonly
```

The apply script **re-runs preflight** immediately before `prisma migrate deploy`. If preflight is **BLOCKED**, Prisma is **not** started. Child process sets **both** `DATABASE_URL` and `DIRECT_URL` to the verified target.

Forbidden: `scripts/migrate-deploy.mjs` (includes seed-legal), `db push`, `migrate resolve` without evidence.

Deploy **applications** separately using immutable bundle SHAs (§1) after schema apply succeeds.

## 4. Expected pending set

Five PROF-H migrations in manifest. Any other pending migration on disk → preflight **BLOCKED**.

## 5. Fix-pass evidence (three gaps closed)

| Gap | Fix | Test |
|-----|-----|------|
| Partial H object probes | 13 `public` probes for all 5 SQL files | Unit: H2_01/H2_03/H5 enum cases → `ok=false` |
| Ledger orphan not on disk | Successful ledger row without folder → BLOCKED | Unit: `20990101_removed_from_disk_package` |
| Handoff checkout ambiguity | Exact release-safety SHA; split read-only vs apply credentials | Docs §2–3 |

## 6. Local verification (fix-pass)

| Command | Exit |
|---------|------|
| `pnpm run test:prof-h-release` | 0 (**21** tests) |
| Upgrade rehearsal `--apply` on `remcard_prof_h_upgrade_rc` | 0 |
| Preflight after rehearsal (unified URLs) | 0 |
| Apply guard when preflight blocked | 0 (Prisma not invoked) |

Rehearsal limitation unchanged: release `9523dcd5` + synthetic ledger proves PROF-H SQL delta only, not production history.

## 7. Rollback / H5 backend

Rolling back backend after H5 remains **unsafe** without forward-fix (stale invites / `branchAccessChangedAt`). No operational toggle in this release.

## 8. Status

**READY_FOR_OPERATOR_CHECK** — not permission to migrate or deploy.
