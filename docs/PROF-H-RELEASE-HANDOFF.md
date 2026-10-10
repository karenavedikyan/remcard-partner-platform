# PROF-H release handoff (H1–H5) — preparation only

**Does not authorize production deploy, migration writes, or publication.**

## Version pins

| Artifact | SHA |
|----------|-----|
| Navigator **immutable application bundle** | `f900bcf9ac364dbd805a0dfe56253d39da257533` |
| Platform **immutable application bundle** | `9a6ab80914e43c2e8a0929ea84a01fa257d01123` |
| Navigator **release-safety tooling** | `a53433d24cec69d2fc4b669a8dbb30e7ce7806d3` |
| Platform **docs handoff** | `de7a5ba68228608b8beffefb29beddb38593e623` |

Manifest: `remcard-navigator/docs/PROF-H-RELEASE-MANIFEST.json`  
Production history: `remcard-navigator/docs/PROF-H-PRODUCTION-HISTORY.md`

## Loopback acceptance (completed on PG 16.15)

| Command | Exit |
|---------|------|
| `pnpm run test:prof-h-release` | **0** (118 tests) |
| `PROF_H_UPGRADE_DATABASE_URL=…/remcard_prof_h_upgrade_rc pnpm run test:prof-h-release-pg` | **0** (3 tests) |
| `node scripts/prof-h-release-production-history-rehearsal.mjs --apply` | **0** (preflight `READY_TO_APPLY` → apply → `ALREADY_APPLIED` → no-op apply) |

## Operator production (Computer — not verified here)

```bash
git checkout a53433d24cec69d2fc4b669a8dbb30e7ce7806d3
node scripts/prof-h-release-migrate-preflight.mjs --mode=production-history
node scripts/prof-h-release-migrate-apply.mjs --apply --mode=production-history
```

Apply phases: `READY_TO_APPLY` / `ALREADY_APPLIED` / `BLOCKED`. Controlled apply only — no `prisma migrate deploy`.

## NOT VERIFIED (production)

- Live `remcard` production-history preflight after Computer run at `ebc20c9e…` (strict) was **BLOCKED**
- Production PG version / lock duration / concurrent operators at scale

## Status

**READY_FOR_OPERATOR_CHECK** — loopback rehearsal PASS; production still operator/Computer.
