# PROF-H release handoff (H1–H5) — preparation only

**Does not authorize production deploy, migration writes, or publication.**

## 1. Version pins

| Artifact | SHA | Notes |
|----------|-----|--------|
| Navigator **immutable application bundle** | `f900bcf9ac364dbd805a0dfe56253d39da257533` | App + migration SQL (unchanged) |
| Platform **immutable application bundle** | `9a6ab80914e43c2e8a0929ea84a01fa257d01123` | PROF cabinet frontend |
| Navigator **release-safety tooling** | _see navigator commit after push_ | production-history preflight + controlled apply |
| Platform **docs handoff** | _this commit_ | No runtime change |

Release baseline for rehearsal diff: navigator `9523dcd5dc4cd0c69b58152604004a6ed27083be`, platform `bb60c608f8b88c910773ab681060fe0a48673ee9`.

Manifest: `remcard-navigator/docs/PROF-H-RELEASE-MANIFEST.json`. Production history: `remcard-navigator/docs/PROF-H-PRODUCTION-HISTORY.md`.

Computer production preflight at `ebc20c9e0ec98d4477d8a51871839fae367d9a47` (**strict** mode) → **BLOCKED** (18 historical issues, 5 PROF-H pending). Use **`--mode=production-history`** for operator readiness on `remcard`.

## 2. Operator A — production-history preflight (read-only)

```bash
cd remcard-navigator
git checkout <release-safety-sha>

export DATABASE_URL='postgresql://…'   # read-only role
export DIRECT_URL='postgresql://…'     # MUST match DATABASE_URL
export PROF_H_EXPECTED_DB_HOST='…'
export PROF_H_EXPECTED_DB_NAME='remcard'

node scripts/prof-h-release-migrate-preflight.mjs --mode=production-history
```

Exit **0** → `READY_FOR_OPERATOR_CHECK` with categories `VERIFIED_HISTORICAL_EXCEPTION`, `STRICT_PASS`, `PENDING_PROF_H`. Exit **1** → **BLOCKED**.

## 3. Operator B — controlled apply (five SQL only)

Migrate role (not read-only). Same DB identity as preflight.

```bash
node scripts/prof-h-release-migrate-apply.mjs --apply --mode=production-history
```

Re-runs production-history preflight before and under advisory lock. **No** `prisma migrate deploy`. Forbidden: `scripts/migrate-deploy.mjs`, `db push`, `migrate resolve` without evidence.

Deploy **applications** separately using immutable bundle SHAs (§1) after schema apply succeeds.

## 4. Five pending PROF-H

Listed in manifest with SHA-256; any other pending on-disk migration → **BLOCKED** (production-history).

## 5. Schema probes

42 objects — `PROF_H_SCHEMA_PROBE_REGISTRY` in navigator release-safety scripts.

## 6. Local verification

| Command | Exit |
|---------|------|
| `pnpm run test:prof-h-release` | 0 (118 tests) |
| `prof-h-release-production-history-rehearsal.mjs --apply` | 0 or BLOCKED if baseline schema ≠ production proofs |
| Apply when preflight blocked | 1, zero SQL executed |

## 7. NOT VERIFIED here

- Live production `remcard` PASS (operator / Computer)
- Full fixture rehearsal PASS on `9523dcd5` db push vs all 18 schema proofs
- Five-migration atomicity under `CREATE TYPE` / `ALTER TYPE` on production volume

## 8. Status

**READY_FOR_OPERATOR_CHECK** — not permission to migrate or deploy.
