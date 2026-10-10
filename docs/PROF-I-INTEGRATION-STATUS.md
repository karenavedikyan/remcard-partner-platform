# PROF-I stream E — integration acceptance

**Date:** 2026-10-10  
**Branch:** `feat/prof-i-integration` (platform; navigator unchanged on this pass)  
**Verdict:** **E PASS** (no hidden console/page errors)

## Verified SHA pair

| Repository | Commit |
|------------|--------|
| remcard-partner-platform | `f5d749f40e17d84b9237ea1b13ba7cb5198db102` (E-tested); doc tip `fea65ab` |
| remcard-navigator | `4a31dbe5d5a67e188c26f13b854c963099b706eb` (unchanged) |

Prior integration tip: platform `167099e`, navigator `4a31dbe5`.

## React #418 (hydration) — cause → fix → evidence

| | |
|---|---|
| **Cause** | `ThemeProvider` initialized `resolvedTheme` via `readInitialResolvedTheme()` reading `document.documentElement.data-theme` on the client, while SSR always used `"light"`. Boot script had already set `data-theme` from `localStorage` (often `dark`), so `ThemeToggle` rendered different icon/`aria-label` on server vs first client pass → React minified error **#418**. A second `[theme]` effect also called `applyDataTheme("system")` before storage was read, risking overwrite of saved preference. |
| **Fix** | Fixed SSR/client placeholder: `resolvedTheme` starts as `"light"` on both sides; single mount effect reads `readStoredThemePreference()`, applies via `applyDataTheme(stored)` without a prior system-only apply; user changes apply in `setTheme` / `toggleLightDark`; system media listener only updates when preference is `system`. Boot script unchanged (no flash). |
| **Evidence** | `ThemeToggle.test.tsx` SSR `renderToString` shows moon/`Включить тёмную тему` while `data-theme=dark`; vitest theme suite **6/6**; prod E run `consoleErrors: []`, `unexpectedConsoleErrors: []`, all theme/bell scenarios **PASS** on 1440/390 light/dark (cold load, reload, toggle). |

## Other cause → fix → evidence (prior fix-pass)

| Issue | Class | Fix | Evidence |
|-------|-------|-----|----------|
| Mutating BFF 403 / payout | Stand | Aligned Origin/ports; one `next start` after build | payout **PASS**, DB checks in report |
| Wizard step 3 | App | `patch()` no longer clears `confirmed` when setting true | wizard + employee **PASS** |
| Bell / overflow / payout harness | App + test | See platform `167099e` report | unchanged this pass |

## Targeted tests (this pass)

```bash
cd remcard-partner-platform
pnpm exec vitest run src/lib/theme-preference.test.ts src/components/layout/ThemeToggle.test.tsx
# exit 0 — 6 tests

NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 REMCARD_API_BASE_URL=http://127.0.0.1:3001 NODE_ENV=production npm run build
# exit 0
```

## Browser E (strict console)

```bash
# Clean prod stand: build → restart platform → navigator :3001
PROF_E_PLATFORM_URL=http://127.0.0.1:3000 node scripts/prof-i-e-integration-browser.mjs
# exit 0 — docs/prof-i-e-browser-report.json
# consoleErrors / unexpectedConsoleErrors must be empty
# employee settlements deny: waitForResponse GET wallet/settlements 403 (not console filter)
```

**Last full E run:** all scenarios **PASS**; `exitCode: 0`; no console/page errors recorded (employee page had **no** `trackPage` on that run).

## Team access contract — `teamCapabilities` (2026-10-10)

Navigator `GET /api/pro/context` adds **`teamCapabilities`** (`canOpenTeamSection`, `canFetchEmployeesOverview`, `canManageEmployeesByBranchId` per branch). Platform **`deriveProfileCabinetAccess`** uses only this server payload (not `UserRole === PRO`). **`employees-overview`** uses `getProfCabinetUser` + scoped branch list: CLIENT only with `canManageEmployees`; PRO managers may view branch roster; manage per-branch flag; no org-wide leak; empty scope → **403**. Moderation notes stay **PRO-only**, unrelated to team.

**Integration:** `prof-i-team-cabinet.integration.test.ts` — CLIENT team in A only, B hidden, revoke → 403 + context off, owner unchanged.

## Invite chain — employee `trackPage` closed (2026-10-10)

**App fix:** gated fetches above; scan-only CLIENT unchanged.

Harness: `PROF_E_INVITE_CHAIN_ONLY=1`, strict `trackPage(employee)`. Expected deny = confirmed GET wallet/settlements **403** only.

```bash
PROF_E_INVITE_CHAIN_ONLY=1 PROF_E_PLATFORM_URL=http://127.0.0.1:3000 \
  node scripts/prof-i-e-integration-browser.mjs
```

| Field | Value |
|-------|--------|
| **runMode** | `invite-employee-chain-only` (not full E) |
| **platform SHA** | `ad9349b2fa07d0b2cff387c8950c33cdc91fb94a` |
| **navigator SHA** | `ecc798328e117394df52e4c0cf4ee246abf0b58c` |
| **exit code** | **0** |
| **scenarios** | wizard + employee-accept-access **PASS** |
| **expectedDenyResponses** | 1× GET wallet/settlements **403** |
| **unexpectedBffGetErrors / unexpectedConsoleErrors / unexpectedPageErrors** | `[]` |

**Verdict:** employee-chain acceptance **PASS** (strict observability). Full E not re-run this pass.

## NOT VERIFIED

- Production / Timeweb / real messaging
- Full PG 28 / proxy 233 / component 124 (no changes in those areas)

## Artifacts

| Path | Repo |
|------|------|
| `src/contexts/ThemeContext.tsx` | platform |
| `scripts/prof-i-e-integration-browser.mjs` | platform |
| `docs/prof-i-e-browser-report.json` | platform |
