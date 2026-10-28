# PROF admin mobile adaptation — verification report

## Branch and scope

| Item | Value |
|------|--------|
| Branch | `feat/admin-mobile-20261028` |
| Base (mobile CSS/nav) | `c2028642e8aafe97a37d45e074040ada83efcac3` |
| Analytics prerequisite (not modified here) | `88a5b9171a05c5d56b3f41d9116cb609611d4d71` on `feat/analytics-login-profile-20261028` |
| Resize / focus fix | `9bddeb4b` (`fix(admin): close mobile nav dialog on desktop viewport resize`) |

This branch does **not** change release/main, backend, or production deploy paths. No PR opened from this run.

## What was verified

### 1. Mobile nav resize / modal lock

- **Fix:** `AdminNav` listens to `matchMedia('(min-width: 721px)')`, clears `menuOpen` when entering desktop width, and restores focus to «Разделы» after the dialog closes.
- **Vitest:** `AdminMobileNav.test.tsx` — open/close, desktop breakpoint, Escape + focus.
- **Chromium (harness `#/shell`):** open «Разделы» @ 375px → resize to 1440px → `openDialogs: 0`, body clicks work → shrink to 375px → menu opens again → Escape → focus on menu button. Screenshot: `screenshots/nav-resize-regression-375-light.png`.

### 2. Isolated browser harness (real admin client components)

**Location:** `scripts/admin-mobile-visual-harness/` + `npm run harness:admin-mobile` (dev) / `npm run harness:admin-mobile:capture` (Playwright batch).

**Not production routes:** Vite app on `127.0.0.1:5199` with hash scenes (`#/overview`, …). `@/lib/prof-admin-*` and partial `@/lib/api-client` are aliased to synthetic fixtures under `scripts/admin-mobile-visual-harness/mocks/`. No auth bypass on Next `/admin/*`; `requireProfPlatformAdmin` and server layout identity are **not** exercised.

**Scenes (real components):**

| Scene hash | Component(s) | Interaction in capture |
|------------|--------------|-------------------------|
| `#/overview` | `AdminOverviewClient` | period chips visible |
| `#/partners` | `AdminPartnersClient` | row select + «Управление партнёром» + visibility preview path |
| `#/partners/partnerships` | `AdminPartnerPartnershipsClient` | status tabs, long counterparty name |
| `#/moderation` | `AdminModerationClient` | queue list |
| `#/moderation/partner-detail` | `PartnerModerationDetailClient` | approve CTA, notes |
| `#/moderation/org-detail` | `OrganizationModerationDetailClient` | org header, actions |
| `#/moderation/org-preview` | `ModerationPreviewModal` (list mode) | preview dialog |
| `#/moderation/partner-preview` | `PartnerModerationPreviewModal` (list mode) | preview dialog |
| `#/notifications` | `AdminNotificationsClient` | inbox row |
| `#/test-users` | `AdminTestUsersClient` | list (GET mocked) |
| `#/password` | `AdminPasswordChangePanel` in `adminPage` shell | form layout |
| `#/shell` | header + `AdminNav` only | nav resize regression |

**Viewport / theme matrix (Chromium):**

- **375 × 812** and **1440 × 900**, light + dark → every scene above (`{scene}-{375|1440}-{light|dark}.png`).
- **320, 430, 768** width (light only) → same scenes (`{scene}-{320|430|768}-light.png`).
- **Document width:** all captures report `pageOverflow: false` in `capture-results.json` (no horizontal page scroll at root).
- **Console:** after harness stub fix for `next/link` `replace`, capture run reported **no** console errors.

**Provenance:** `artifacts/admin-mobile/capture-results.json` (`capturedAt`, per-file metrics, nav resize log). Screenshots under `artifacts/admin-mobile/screenshots/`.

### Harness obstacles (documented, not masked as admin UI)

| Issue | Resolution |
|-------|------------|
| Vite `@` alias shadowed `@/lib/...` mocks | Use ordered `resolve.alias` array; specific `@/lib/*` before `@` → `src`. |
| Dev server bound IPv6-only; `127.0.0.1` refused | Set `server.host: "127.0.0.1"` in harness Vite config. |
| `AccountSessionMenu` pulled real `getAuthMe` → failed fetch | Harness `api-client` mock exports stub `getAuthMe` + routed `remcardFetch` for test-users paths only; other paths throw `501` (visible in devtools, not shown as login page). |
| Initial overview showed «Некорректный ответ сервера» | Caused by mocks not applied (alias order); fixed before screenshots. |
| Partnerships scene: React warning on `replace` prop | Harness `next/link` stub strips `replace`/`prefetch` (harness-only). |
| Playwright `Counterparty` wait timeout | Fixture uses Russian long name; capture waits on «Контрагент с очень длинным…». |

**Explicitly not verified via harness:**

- Signed-in Next.js `/admin/*` with real cookies and `requireProfPlatformAdmin`.
- Server actions, lifecycle **apply** POST success, moderation **approve/reject** POST, notification channel OAuth bind, test-user **enter** session, password change submit.
- Full moderation «full preview» fetch graphs (only list-mode preview modals captured).

## Automated tests (this branch)

```bash
npx vitest run --maxWorkers=1 src/app/admin/   # 27 files, 126 tests — pass
npm run test:proxy                              # pass
npm run build                                   # pass
```

## Files touched (mobile completion)

- `src/app/admin/AdminNav.tsx`, `AdminMobileNav.test.tsx`
- `scripts/admin-mobile-visual-harness/**`, `scripts/admin-mobile-visual-capture.mjs`
- `package.json` — `harness:admin-mobile`, `harness:admin-mobile:capture`
- `artifacts/admin-mobile/REPORT.md`, `capture-results.json`, `screenshots/*`

## Prior report correction

Removed stale self-referential candidate SHA `c575fe0…` from an earlier draft. Use the tip of `feat/admin-mobile-20261028` after the harness commit(s) for review.
