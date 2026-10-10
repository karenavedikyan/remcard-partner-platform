# PROF-I stream E — integration acceptance

**Date:** 2026-10-10  
**Branch:** `feat/prof-i-integration` (both repos)  
**Verdict:** **BLOCKED** (PG + builds OK; cross-feature browser incomplete)

## Verified SHA pair (E run)

| Repository | Commit |
|------------|--------|
| remcard-partner-platform | `67da0483c78aa2f6e4757e4dbb1505261c0f5b38` |
| remcard-navigator | `edde090c38fc0d3f917144d91183e67618e06660` |

## Loopback DB guard

```bash
cd /tmp/prof-i-worktrees/prof-i-e-navigator
set -a && source .env.local && set +a
node scripts/prof-i-e-pg-preflight.mjs
# exit 0 → {"ok":true,"migrationsApplied":["already_present"],...}
psql "$DATABASE_URL" -t -A -c "SELECT current_database(), COALESCE(inet_server_addr()::text,'local');"
# remcard_prof_test|127.0.0.1/32
```

## PostgreSQL / Vitest (remcard_prof_test)

```bash
cd /tmp/prof-i-worktrees/prof-i-e-navigator
set -a && source .env.local && set +a
node scripts/prof-i-e-pg-preflight.mjs                    # exit 0
pnpm exec tsx scripts/prof-i-e-payout-fixtures.ts           # exit 0
pnpm exec vitest run \
  src/lib/__tests__/profIInbox.integration.test.ts \
  src/lib/__tests__/profICPermissions.integration.test.ts \
  src/lib/__tests__/profIPayout.integration.test.ts \
  src/lib/__tests__/profH5PartialRevoke.integration.test.ts \
  src/lib/__tests__/bonusPayout.test.ts \
  src/lib/__tests__/prof-i-permissions.test.ts \
  src/lib/__tests__/profInbox.test.ts
# exit 0 — 7 files, 28 tests passed
```

Navigator `profIPayout.integration.test.ts`: concurrent idempotent `payBonus` requests fixed (pre-built `NextRequest`s before `Promise.all`).

## Production builds (final integration tree)

| App | Command | Exit |
|-----|---------|------|
| navigator | `NODE_ENV=production PLATFORM_INN=000000000000 PLATFORM_OGRN=000000000000000 pnpm run build` | **0** |
| platform | `NODE_ENV=production npm run build` (after `NEXT_PUBLIC_APP_URL` aligned to serve port) | **0** |

**Not re-run:** platform `test:proxy` 233/233, `test:component` 124/124 (unchanged integration tip).

## Browser integration (Playwright)

**Serve (loopback only):**

- Navigator: `PORT=3001 NODE_ENV=production pnpm run start` with `.env.production.local` ← copy of `.env.local` (JWT + DATABASE).
- Platform: `PORT=3000 NODE_ENV=production npm run start` with `.env.production.local` where `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000` and `REMCARD_API_BASE_URL=http://127.0.0.1:3001` (mutating BFF requires matching Origin).

```bash
cd /tmp/prof-i-worktrees/prof-i-e-platform
set -a && source /tmp/prof-i-worktrees/prof-i-e-navigator/.env.local && set +a
PROF_E_PLATFORM_URL=http://127.0.0.1:3000 node scripts/prof-i-e-integration-browser.mjs
# exit 1 — see report
```

**Report:** `docs/prof-i-e-browser-report.json`  
**Screenshots:** `docs/screenshots/prof-i-e/`

| Scenario | Result |
|----------|--------|
| theme 1440 light / 390 dark | **PASS** |
| bell + notifications link 1440 / 390 | **PASS** |
| 390 horizontal overflow (home) | **FAIL** |
| team invite wizard (UI) | **FAIL** (step 3 confirm → submit stays disabled) |
| employee accept + access enforcement | **FAIL** (no invite token; blocked by wizard) |
| owner payout UI → DB | **FAIL** (modal screenshot taken; `BonusPayoutRecord` count 0; bonus stays CONFIRMED) |

Console: intermittent **403** on mutating `/api/remcard/*` when platform `NEXT_PUBLIC_APP_URL` ≠ browser origin port (documented above).

## NOT VERIFIED

- Production / Timeweb / Yandex Maps live
- Full PROF-H / proxy 233 / component 124 re-run after E-only script changes
- Real Telegram/MAX/bank/bots

## E artifacts (this run)

| Path | Repo |
|------|------|
| `scripts/prof-i-e-integration-browser.mjs` | platform |
| `scripts/prof-i-e-pg-preflight.mjs` | navigator |
| `scripts/prof-i-e-payout-fixtures.ts` | navigator |
| `scripts/prof-i-e-browser-fixtures.ts` | navigator |
| `docs/prof-i-e-browser-report.json` | platform |
| `docs/screenshots/prof-i-e/*.png` | platform |
