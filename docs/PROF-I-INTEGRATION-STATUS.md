# PROF-I stream E — integration acceptance (fix-pass)

**Date:** 2026-10-10  
**Branch:** `feat/prof-i-integration` (both repos)  
**Verdict:** **E PASS**

## Verified SHA pair (this fix-pass)

| Repository | Commit |
|------------|--------|
| remcard-partner-platform | `ffb1fd9f436f9a9d75117d571444db383ce8706e` |
| remcard-navigator | `4a31dbe5d5a67e188c26f13b854c963099b706eb` |

Base for this pass: platform `4b7600d` + navigator `a10598ab`.

## Cause → fix → evidence

| Issue | Class | Fix | Evidence |
|-------|-------|-----|----------|
| Mutating BFF 403 / payout no DB row | **Stand** | Single platform `:3000`, `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000` at build+start; `REMCARD_API_BASE_URL=http://127.0.0.1:3001`; shared `JWT_SECRET`; restart `next start` after each prod build (avoid stale chunk 400) | `mutatingBffFailures: []` in report; payout POST 200; DB `BonusPayoutRecord=1`, bonus `PAID`, inbox `1` |
| Wizard step 3 submit disabled | **App** | `ProfileTeamInviteWizard.patch()` no longer forces `confirmed: false` when setting `confirmed: true` | Playwright `check()` + enabled submit; POST `/api/pro/invites` 200; employee accept **PASS** |
| Bell weak / wrong seed | **Test + fixture** | Harness waits PATCH mark-all + unread aria; seed via `insertProfInbox` (`prof:` dedupe) | All `bell-*` **PASS** on 1440/390 × light/dark |
| 390 horizontal overflow | **App** | `AppShell.module.css`: mobile topbar flex/`min-width`, hide brand ≤520px, tighter logout | `390-horizontal-overflow-*` **PASS** (0px tolerance) |
| Payout harness | **Test** | `data-testid=settlements-record-payout-{bonusId}`; `waitForResponse` on pay POST; DB poll | `owner-payout-ui` **PASS** |
| Invite token in report JSON | **Test** | Report exports fixture ids only; invite token kept in-memory | `fixtures` block has no token fields |

## Loopback stand (required)

```bash
# DB guard
cd remcard-navigator && set -a && source .env.local && set +a
node scripts/prof-i-e-pg-preflight.mjs   # exit 0, remcard_prof_test @ 127.0.0.1

# Build (platform URL must match serve port)
cd remcard-partner-platform
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 REMCARD_API_BASE_URL=http://127.0.0.1:3001 NODE_ENV=production npm run build

# One process each (restart after every platform rebuild)
cd remcard-navigator && PORT=3001 NODE_ENV=production pnpm run start
cd remcard-partner-platform && PORT=3000 NODE_ENV=production npm run start
# .env.production.local: JWT_SECRET, DATABASE_URL, NEXT_PUBLIC_APP_URL, REMCARD_API_BASE_URL, basic auth to navigator
```

## Browser E (final)

```bash
cd remcard-partner-platform
set -a && source ../remcard-navigator/.env.local && set +a
PROF_E_PLATFORM_URL=http://127.0.0.1:3000 node scripts/prof-i-e-integration-browser.mjs
# exit 0 — docs/prof-i-e-browser-report.json
```

**Last run:** `exitCode: 0` — all scenarios **PASS** (themes/bell/overflow/payout/wizard/employee).

## Targeted regression (this pass)

| Check | Exit |
|-------|------|
| `vitest run profInbox.test.ts profIInbox.integration.test.ts` (navigator) | **0** (7 tests) |
| Platform prod `npm run build` after CSS/wizard/settlements changes | **0** |

**Not re-run:** full PG 28 / proxy 233 / component 124 (unchanged upstream suites).

## NOT VERIFIED

- Production / Timeweb / real Telegram-MAX-bank delivery
- React hydration warning #418 on theme toggle (logged, filtered in harness as known prod noise; no functional fail)

## Artifacts

| Path | Repo |
|------|------|
| `scripts/prof-i-e-integration-browser.mjs` | platform |
| `scripts/prof-i-e-browser-fixtures.ts` | navigator |
| `docs/prof-i-e-browser-report.json` | platform |
| `docs/screenshots/prof-i-e/*.png` | platform |
