# PROF-H release handoff (H1–H5) — preparation only

**This document does not authorize production deploy.** It packages a release candidate, migration plan, verification evidence, and operator steps.

## 1. Candidate SHA pair (feature branches)

| Repository | Branch | Role | SHA (full) |
|------------|--------|------|------------|
| remcard-navigator | `feat/prof-h-profile-redesign` | backend + migrations | `9724293cb212e9edcea3e4bafe52754640a0f87f` |
| remcard-partner-platform | `feat/prof-h-profile-redesign` | PROF cabinet frontend | `2d0ca5c9dd183037790764506b0046bca5a52020` (+ doc commit on push) |

**Merge-base with release (no release-only commits behind feature):**

- Navigator: `9523dcd5dc4cd0c69b58152604004a6ed27083be` (= `release/prof-backend-v1-20261007` tip)
- Platform: `bb60c608f8b88c910773ab681060fe0a48673ee9` (= `release/prof-v1-20261007` tip)

Release SHAs are **Git references for diffing**, not confirmed live deployment IDs. Operator must confirm Timeweb/runtime metadata separately.

**Manifest source of truth:** `remcard-navigator/docs/PROF-H-RELEASE-MANIFEST.json` (checksums, migration order, legacy names).

## 2. Release scope

| Scope | Content | DB delta on release backend |
|-------|---------|------------------------------|
| H1 | Profile structure / sections | — (app) |
| H2 | Working profile, directions, internal search | 3 migrations |
| H3 | Voluntary catalog + public draft | On release already |
| H4 | Branches, contacts, schedule, address confirm | On release already |
| H5 | Team, branch access, invites, partial revoke | 2 migrations |

**Excluded:** PROF-G, unrelated branches, PROF-D ledger repair, disabling legacy remcard.ru cabinet.

**Prep change (blocker fix):** migration folder renames so Prisma lexicographic order matches dependencies (H2 `_01/_02/_03`, H5 `20261011_…` after `organization_team`). See `docs/PROF-H-RELEASE-MIGRATIONS.md`.

## 3. Migration apply (operator)

Single mechanism — **`npx prisma migrate deploy`** via **direct** `DIRECT_URL`, after read-only preflight:

```bash
cd remcard-navigator
git checkout feat/prof-h-profile-redesign
git pull
# checkout exact candidate SHA from manifest

DIRECT_URL="<direct-postgres-url>" node scripts/prof-h-release-migrate-preflight.mjs
# exit 0 required

DIRECT_URL="<direct-postgres-url>" npx prisma migrate deploy
```

- **5** pending SQL migrations on top of release backend ledger (names + SHA-256 in manifest).
- **Do not** use `scripts/migrate-deploy.mjs` for the migration-only step (runs `seed-legal.ts` afterward).
- **Do not** `db push`, `reset`, or `resolve` without evidence.
- If **legacy** ledger names exist (`20261010100000_…`, unprefixed H2 folders), **stop** — manual reconciliation (manifest `legacyLedgerNames`).

Timeweb backend start (`scripts/start-prof-release.mjs`) applies **only** P124 idempotency gate — **not** the H2/H5 chain.

## 4. Verification executed (prep environment)

Synthetic **INN/OGRN** placeholders used for builds (`000000000000` / `000000000000000`) — not for production config.

| Check | Command | Exit |
|-------|---------|------|
| Migration order unit test | `node --test scripts/lib/__tests__/prof-h-release-manifest.test.mjs` | 0 |
| Upgrade rehearsal (isolated `remcard_prof_h_upgrade_rc`) | `PROF_H_UPGRADE_DATABASE_URL=postgresql://…/remcard_prof_h_upgrade_rc node scripts/prof-h-release-upgrade-rehearsal.mjs --apply` | 0 — 5 migrations applied; second deploy no-op |
| Preflight on rehearsal DB | `DIRECT_URL=…/remcard_prof_h_upgrade_rc node scripts/prof-h-release-migrate-preflight.mjs` | 0 — all 5 applied |
| Navigator typecheck | `pnpm run typecheck` | 0 |
| Navigator production build | `CI=true OPERATOR_INN=… PLATFORM_INN=… pnpm run build` | 0 |
| PG integration H2–H5 | `pnpm exec vitest run src/lib/__tests__/profH{2,3,4,5}*.integration.test.ts` (+ catalog fix pass) | 0 — **50** tests |
| Platform tests | `npm run test` | 0 — proxy + **90** component |
| Platform production build | `CI=true npm run build` | 0 |
| Browser smoke (H5 acceptance = team, store context, partial revoke, 390 overflow) | `source .env.local && node scripts/prof-h5-browser-acceptance.mjs` | 0 |

Prior acceptance for H2–H4 browser/scripts: `docs/PROF-H-PROGRESS.md`, `docs/PROF-H5-ACCEPTANCE.md`. Screenshots: `/opt/cursor/artifacts/screenshots/prof-h5-*.png`.

**Skipped / not re-run this prep:** full H2+H3+H4 browser matrix in one script (covered by prior acceptance + H5 cross-cutting smoke). Real Telegram/MAX login, live Yandex, production blob upload.

## 5. Suggested production rollout order

1. **Backup** (operator — see §7) + confirm backup ID stored.
2. **Read-only preflight** on production `DIRECT_URL` (migration ledger + checksums).
3. **Maintenance window / traffic note** if desired (additive DDL; low downtime expected).
4. **`prisma migrate deploy`** (5 migrations).
5. **Deploy backend** to candidate navigator SHA (`pnpm build` artifact / Timeweb).
6. **Deploy frontend** to candidate platform SHA (`npm run build`).
7. **Read-only smoke** (public pages, auth cookie, profile load, no write tests).
8. **Write smoke** (separate approval): working save, draft catalog, branch create, invite accept — per runbook.

**Avoid incompatible states:**

| State | Risk |
|-------|------|
| New backend + old DB (migrations not applied) | H2/H5 API vs schema mismatch — **block deploy until migrate** |
| New DB schema + old backend | Additive columns mostly OK; **H5** new tables unused — OK short term |
| New frontend + old backend | Team UI / working profile / BFF routes missing — **broken** |
| Old frontend + new backend | Partial: legacy cabinet may work; **PROF routes** need new frontend |

Deploy **migrations before or with backend**; deploy **platform after backend** is up.

## 6. Compatibility notes

- **Old FE + new BE:** remcard.ru legacy cabinet unchanged; new platform required for PROF-H UI.
- **Rollback FE only:** Safe if backend stays new; users lose new UI only.
- **Rollback BE after H5:** **Unsafe** if partial revoke / stale-invite logic relied upon — old backend may **ignore** `branchAccessChangedAt` and accept stale invites. Prefer **keep new backend** or **disable org invites** operationally until forward fix.
- **Rollback DB:** Restore from backup only with explicit data-loss review (additive columns + new rows after cutover).

## 7. Backup & rollback (instructions only — not executed)

**Backup:** use operator’s standard PostgreSQL backup for the navigator database (Timeweb panel or `pg_dump` runbook). Include full DB + confirm restore drill on staging. Record backup **ID/ timestamp** in change ticket (no secrets in chat).

**Rollback apps:** redeploy previous **known-good deployment artifacts** (not just Git SHA unless that SHA is what Timeweb runs). Order: **frontend first** (reduce bad UX) or **backend first** if security — for H5 stale-invite issue, **do not** roll backend back without invite freeze.

**Schema:** do **not** DROP new columns/tables as default rollback. Additive schema does **not** guarantee old code safety for H5 auth paths.

## 8. External configuration checklist (no secret values)

| Item | What to verify | Expected | Blocker until |
|------|----------------|----------|----------------|
| Backend URL / CORS | Platform `REMCARD_API_BASE_URL`, navigator allowed origins | BFF 200, no CORS on `/api/remcard/*` | Deploy platform |
| JWT / session cookie | Same `JWT_SECRET` on navigator; cookie domain for prof host | `/api/auth/me` 200 when logged in | Smoke |
| `remcard-pro-branch` cookie | BFF forwards Set-Cookie from `/api/pro/context` | Branch switch persists | H5 smoke |
| StaffInvite / partnership URLs | Invite links hit navigator `/invite/accept` | Accept flow 200 | H5 prod smoke |
| `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` | Key allows production domain | Geocoder loads | H4 address (live) |
| Blob/storage | Logo upload env on navigator | Upload returns URL | Catalog logo (live) |
| Telegram / MAX | Bot tokens, webhook URLs unchanged | Login works | Post-deploy external |
| Legal env | `OPERATOR_INN`, `PLATFORM_INN`, OGRN, documents | `pnpm run check:legal-env` pass in prod image | Backend start |

**Remaining live checks (operator):** real Telegram/MAX login, live Yandex tile/geocode on prod domain, real logo upload to production storage.

## 9. Draft permission request (for a future ticket)

> Request approval to deploy PROF-H release candidate: navigator `<SHA>` + platform `2d0ca5c9…` (or updated platform doc SHA). Preconditions: production backup confirmed, `prof-h-release-migrate-preflight.mjs` exit 0 on `DIRECT_URL`, migrate deploy applies exactly 5 migrations per manifest, no legacy ledger names. Rollout: backup → preflight → migrate → backend → frontend → read-only smoke → approved write smoke. Rollback constraints documented for H5 backend revert.

## 10. Release status

**READY_FOR_OPERATOR_CHECK** — candidate builds and tests pass; migration order fix and upgrade rehearsal succeeded on isolated DB. Required before approval: production read-only preflight, confirmed deployment metadata, external live checks in §8.

---

Platform doc commit SHA: update `PROF-H-PROGRESS.md` after push. Navigator candidate SHA: see `PROF-H-RELEASE-MANIFEST.json` after prep commit.
