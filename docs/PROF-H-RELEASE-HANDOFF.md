# PROF-H release handoff (H1–H5) — preparation only

**Does not authorize production deploy, migration writes, or publication.**

## 1. Version pins (no moving branch)

| Artifact | SHA | Role |
|----------|-----|------|
| Navigator **immutable bundle** (app + migrations) | `f900bcf9ac364dbd805a0dfe56253d39da257533` | Checkout for code parity |
| Platform **immutable bundle** | `9a6ab80914e43c2e8a0929ea84a01fa257d01123` | Checkout for code parity |
| Navigator **release-safety scripts/docs** | _see git tip of `feat/prof-h-profile-redesign` after fix-pass commit_ | Preflight/apply/manifest updates |
| Platform **handoff docs only** | _same branch tip after fix-pass_ | This file |

Manifest source of truth: `remcard-navigator/docs/PROF-H-RELEASE-MANIFEST.json` (checksums, order, legacy names, DB policy). **Do not** use `git pull` on a branch name as the release version — use explicit SHAs above.

Release baseline for diff/rehearsal (not live deployment ID):

- Navigator `9523dcd5dc4cd0c69b58152604004a6ed27083be`
- Platform `bb60c608f8b88c910773ab681060fe0a48673ee9`

## 2. Expected pending migrations

Exactly **five** PROF-H SQL files in manifest (H2×3 + H5×2). After release backend ledger is complete, preflight `expectedPendingProfH` should list those five names until apply. **Any other pending** migration on disk → preflight **BLOCKED** (full `migrate deploy` would apply more than PROF-H).

## 3. Operator read-only preflight (production)

```bash
cd remcard-navigator
git checkout f900bcf9ac364dbd805a0dfe56253d39da257533  # or later tip that includes release-safety scripts

export DATABASE_URL='postgresql://…'   # read-only role
export DIRECT_URL='postgresql://…'     # MUST match DATABASE_URL identity
export PROF_H_EXPECTED_DB_HOST='…'
export PROF_H_EXPECTED_DB_NAME='…'

node scripts/prof-h-release-migrate-preflight.mjs --mode=operator-readonly
```

Exit **0** → `READY_FOR_OPERATOR_CHECK` for migration **readiness only**. Exit **1** → `BLOCKED` (see JSON `blockers`).

**Not executed in this prep task:** live production connection.

## 4. Apply (only after separate written approval + backup)

```bash
DATABASE_URL='…' DIRECT_URL='…' \
  node scripts/prof-h-release-migrate-apply.mjs --apply --mode=operator-readonly
```

Forbidden: `scripts/migrate-deploy.mjs`, `seed-legal` in migrate step, `db push`, `migrate resolve` without evidence.

## 5. Defect → fix → test (release-safety fix-pass)

| Defect | Fix | Test |
|--------|-----|------|
| `DIRECT_URL` / `DATABASE_URL` could diverge | `resolveProfHDatabaseTarget()` requires both, same identity; Prisma child gets both | Unit: mismatched URLs → `url_identity_mismatch` |
| Preflight trusted computed SQL hashes | Manifest JSON authoritative; disk verified against manifest | Unit: tampered manifest sha → block |
| Only 5 PROF-H migrations audited | Full disk folder vs ledger; unknown pending blocked | Unit: extra pending migration |
| Loopback-only preflight blocked operator handoff | `--mode=operator-readonly` + expected host/db env | Unit: operator target mismatch |
| Unfinished ledger rows ignored off-disk | Scan all ledger rows | Unit: unfinished non–PROF-H row |
| Duplicate successful ledger collapsed | Per-name row buckets | Unit: duplicate_success |
| Upgrade rehearsal used moving release ref | Pinned `9523dcd5…` worktree | Rehearsal `--apply` exit 0 |
| Self-referential manifest SHAs | `candidateGit.immutableBundleSha` + separate docs tip | Handoff table §1 |

## 6. Commands run locally (fix-pass)

| Command | Exit |
|---------|------|
| `pnpm run test:prof-h-release` | 0 (16 tests) |
| `PROF_H_UPGRADE_DATABASE_URL=…/remcard_prof_h_upgrade_rc node scripts/prof-h-release-upgrade-rehearsal.mjs --apply` | 0 |
| `DATABASE_URL=… DIRECT_URL=…/remcard_prof_h_upgrade_rc node scripts/prof-h-release-migrate-preflight.mjs` | 0 (post-rehearsal) |
| Mismatch probe: `DATABASE_URL=…/remcard_prof_test` + `DIRECT_URL=…/remcard_prof_h_upgrade_rc` preflight | 1 |

Browser H1–H5 **not re-run** (no app/runtime change in immutable bundle).

## 7. Upgrade rehearsal limitations

- Release baseline via **fixed SHA** `9523dcd5…` worktree + `db push` + synthetic ledger (early migrations cannot bootstrap empty DB).
- Proves **PROF-H SQL delta** applies in order and is idempotent on isolated `remcard_prof_h_upgrade_rc`.
- **Does not** prove production historical ledger health or pre-20260325 bootstrap path.

## 8. Rollout order (unchanged)

Backup (confirmed ID) → read-only preflight → **separate approval** → apply script → deploy backend → deploy frontend → read-only smoke → approved write smoke.

## 9. Rollback / H5 backend revert

**Not safe** to roll back backend after H5 without a **proven** block on dangerous legacy invite paths: old code may ignore `branchAccessChangedAt` and stale-invite guards. There is **no** operational toggle in this release. Forward-fix options: keep new backend, freeze org invites, or DB restore with explicit data-loss review. **No** DROP schema default.

## 10. External checks

Unchanged from prior handoff: JWT alignment, BFF, Yandex live, blob upload, Telegram/MAX — operator-owned, not mocked in preflight.

## 11. Status

**READY_FOR_OPERATOR_CHECK** — release-safety tooling verified locally; production read-only preflight and external checks remain.

## 12. Draft permission text

> Request approval to run `prof-h-release-migrate-apply.mjs --apply` after backup and preflight exit 0 on production read-only URLs. Deploy navigator immutable bundle `f900bcf9…` plus release-safety script tip, platform `9a6ab809…`, following manifest pending set (5 migrations).
