# PROF-E acceptance matrix (fix-pass)

| Check | Result | Notes |
|-------|--------|-------|
| Unit/component (platform) | **PASS** | 218 proxy (incl. notification-settings-ui, profile-catalog-state, profile-save) + **40** vitest (ProfileEditor, NotificationSettingsPanel, …) |
| Unit (navigator) | **PASS** | notificationSettings, notificationBind, proProfileCompleteness, profCabinetUrls |
| Navigator `pnpm typecheck` | **PASS** | |
| Navigator prod build | **PASS** | `NODE_ENV=production` + synthetic INN/OGRN |
| Platform prod build | **PASS** | `NODE_ENV=production` |
| Bot bind security (PG/integration) | **NOT VERIFIED** | Unit tests cover same-user bind, identity conflict, replay; no live bot webhook on test DB this run |
| PG full CLIENT MASTER + STORE/COMPANY cycle | **NOT VERIFIED** | No new end-to-end PG script executed in this run |
| Browser 1440/390 on working test backend | **NOT VERIFIED** | No healthy test backend + cabinet stack reachable from agent VM (local `:3000` not serving) |
| Real Telegram/MAX delivery | **NOT VERIFIED** | Test endpoint uses rate-limit + per-channel skipped/failed; no production bot sends |

## Review items (c2b5caa/fb30ba2 fix-pass)

| # | Topic | Result |
|---|--------|--------|
| 1 | Safe notification bind (no contacts/link merge) | **PASS** (code + unit); live bot **NOT VERIFIED** |
| 2 | Explicit none channels + test partial results | **PASS** (code + unit) |
| 3 | STORE/COMPANY org/branch + status UX | **PASS** (code); full moderation PG **NOT VERIFIED** |
| 4 | Honest profile save coordinator | **PASS** (code + unit) |
| 5 | returnTo, notes error/retry, dual revise links | **PASS** (code) |
| 6 | New component tests + browser/PG | **PARTIAL** — new tests **PASS**; browser/PG **NOT VERIFIED** |

Rollback: revert feature branch commits on both repos; no production migrations in this change set.
