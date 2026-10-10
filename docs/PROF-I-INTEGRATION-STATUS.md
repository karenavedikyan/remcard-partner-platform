# PROF-I stream E — integration acceptance

**Date:** 2026-10-10  
**Branch:** `feat/prof-i-integration` (platform; navigator unchanged on this pass)  
**Verdict:** **E PASS** (no hidden console/page errors)

## Verified SHA pair

| Repository | Commit |
|------------|--------|
| remcard-partner-platform | `41798eab947c1af05cf75c0677bf4c9a4bb8f3c2` |
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

**Last E run:** all scenarios **PASS**; `exitCode: 0`; no console/page errors recorded.

## NOT VERIFIED

- Production / Timeweb / real messaging
- Full PG 28 / proxy 233 / component 124 (no changes in those areas)

## Artifacts

| Path | Repo |
|------|------|
| `src/contexts/ThemeContext.tsx` | platform |
| `scripts/prof-i-e-integration-browser.mjs` | platform |
| `docs/prof-i-e-browser-report.json` | platform |
