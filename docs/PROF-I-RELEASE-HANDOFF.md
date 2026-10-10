# PROF-I release handoff — preparation only

**Does not authorize production deploy, migration writes, publication, real invites, or real payouts.**

## Version pins

| Artifact | SHA |
|----------|-----|
| Navigator **immutable runtime** | `ecc798328e117394df52e4c0cf4ee246abf0b58c` |
| Platform **immutable runtime** | `ad9349b2fa07d0b2cff387c8950c33cdc91fb94a` |
| Navigator **release scripts + manifest** | `c8f660296ef2c98b34e757b076cb5d0461bde39a` |
| Platform **integration status + handoff** | `e016e3684355f997f8f3a874fef28ed723d50951` |

Manifest: `remcard-navigator/docs/PROF-I-RELEASE-MANIFEST.json`  
Migrations: `remcard-navigator/docs/PROF-I-RELEASE-MIGRATIONS.md`  
Acceptance table: `docs/PROF-I-INTEGRATION-STATUS.md`

Controlled apply: `scripts/prof-i-release-migrate-preflight.mjs` + `scripts/prof-i-release-migrate-apply.mjs` (checkout navigator **release-scripts** commit from manifest/handoff table). **Do not** use `prisma migrate deploy`.

---

## A. Read-only production preflight (future operator step)

Run from operator workstation with **read-only** DB role and production tunnel if used.

```bash
cd remcard-navigator
# Checkout release-scripts tip (manifest/handoff SHA), not necessarily runtime ecc79832.

export DATABASE_URL='postgresql://…'
export DIRECT_URL='postgresql://…'
export PROF_I_EXPECTED_DB_HOST='…'
export PROF_I_EXPECTED_DB_NAME='remcard'

node scripts/prof-i-release-migrate-preflight.mjs --mode=production-history
```

**Stop if:** pending set ≠ exactly three PROF-I migrations (after H complete), ledger drift, partial I migrations, or URL identity mismatch. **Do not** `migrate resolve`, `db push`, or edit `_prisma_migrations`.

---

## B. Backup (operator — not executed in this pass)

Before any write:

1. **PostgreSQL:** full logical backup of production `remcard` (schema + data) and retention per operator policy.
2. **Confirm:** restore drill on a non-production instance **or** verified backup checksum + size + completion timestamp recorded in the release ticket.
3. **Applications:** note current deployment IDs / immutable SHAs actually serving traffic (see D).

This package **does not** run backup/restore.

---

## C. Deploy order (migrations → backend → frontend)

| Phase | Component | Rationale |
|-------|-----------|-----------|
| 1 | **PROF-H complete on DB** | PROF-I SQL depends on H-five ledger rows (`20261011_prof_h5_branch_access_changed` last). |
| 2 | **PROF-I migrations** (controlled apply) | See navigator migrations doc; write creds `PROF_I_APPLY_*`. |
| 3 | **Navigator backend** @ `ecc79832` | Serves `/api/pro/context` with `teamCapabilities`, scoped `employees-overview`, inbox/payout APIs. |
| 4 | **Platform frontend** @ `ad9349b` | BFF + profile gates consume `teamCapabilities`; must match navigator origin. |

**Build-time env (platform — rebuild required after change):**

- `NEXT_PUBLIC_APP_URL` → production partner cabinet origin (e.g. `https://prof.remcard.ru`), **not** loopback stand values.
- `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`, optional `NEXT_PUBLIC_CERTIFICATE_BASE_URL`.

**Runtime env (platform server):**

- `REMCARD_API_BASE_URL` → production navigator origin (same site users hit for API), with optional `REMCARD_API_BASIC_*` pair.

**Navigator:**

- `NEXT_PUBLIC_BASE_URL` (build-time public origin), `DATABASE_URL` / `DIRECT_URL`, `JWT_SECRET`.

Deploy platform **after** navigator when API contract/schema changes; for this pair, deploy **together** in one maintenance window.

---

## D. Verify deployment IDs vs immutable SHA

After deploy:

```bash
# Navigator host
curl -sS "https://<navigator-origin>/api/health"   # or operator’s canonical probe
git rev-parse ecc798328e117394df52e4c0cf4ee246abf0b58c  # compare to deployed build metadata / CI record

# Platform host — use operator Vercel/hosting deployment view or build SHA embedded in release CI
```

**Stop if:** running revision ≠ manifest runtime SHA for either app.

---

## E. Post-release smoke (no real payouts / invites without separate approval)

Manual or scripted **read-only / test-account** checks:

1. Login to partner cabinet (existing test PRO/CLIENT accounts).
2. Theme toggle / cold load (no hydration console errors).
3. Inbox bell + notifications list (dedupe behaviour — no duplicate rows for same dedupeKey).
4. Profile → team: CLIENT with manage right in branch **A** only; **no** roster leak to branch **B**; revoke removes access; org owner unchanged.
5. Branches / permissions UI loads without 401 `employees-overview` for scan-only CLIENT.

**Do not** execute real bonus payouts, mass invites, or Timeweb changes in this smoke.

Evidence references (loopback): `docs/prof-i-e-browser-report.json`, navigator `prof-i-team-cabinet.integration.test.ts`.

---

## F. Rollback

| Layer | Action |
|-------|--------|
| **Platform** | Redeploy previous platform immutable SHA; ensure `NEXT_PUBLIC_APP_URL` and `REMCARD_API_BASE_URL` still coherent. |
| **Navigator** | Redeploy previous navigator SHA **only if** schema still compatible; if I migrations applied, older code may ignore new columns/tables but payout/permission features may break — coordinate with schema decision. |
| **Schema** | PROF-I SQL is **additive**. **Do not** auto-DROP `BonusPayoutRecord`, permission columns, or dedupe index in panic rollback — plan forward fix or DBA-reviewed script. Account for new permissions data and inbox dedupe keys when restoring from backup. |

---

## G. External — NOT VERIFIED

Treat as **NOT VERIFIED** (not PASS) for this package:

- Live production login/session on real IdP
- Payment cards, real wallet settlements, production payout rails
- Object storage (`BLOB_READ_WRITE_TOKEN`) uploads in prod
- Telegram/MAX delivery, email/SMS invites at scale
- Timeweb DNS/hosting changes

---

## Loopback verification completed in preparation pass

| Check | Result |
|-------|--------|
| Navigator `organizationTeamCabinet.test.ts` | exit 0 |
| Navigator `prof-i-team-cabinet.integration.test.ts` on `remcard_prof_test` | exit 0 |
| Platform `profile-cabinet-access.test.ts` | exit 0 |
| `pnpm run test:prof-i-release` | exit 0 (manifest + apply guards) |
| `prof-i-release-controlled-rehearsal.mjs --apply` on `remcard_prof_i_controlled_rehearsal` | **PASS** (synthetic H-complete baseline; not production) |

Full browser **E** on SHA pair `ad9349b` + `ecc79832` was **not** re-run (see integration status). Employee-chain-only **PASS** on that pair.

---

## Status

**READY_FOR_OPERATOR_CHECK** — loopback controlled rehearsal PASS; production preflight/apply remains operator-only. **Not** permission to publish.
