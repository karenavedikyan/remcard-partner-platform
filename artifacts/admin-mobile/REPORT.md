# PROF admin mobile adaptation

## Branch dependency

| Item | SHA / branch |
|------|----------------|
| Production base | `d6de8c5f723504fb379108ec106a770f58bc4b9d` |
| Analytics prerequisite | `88a5b9171a05c5d56b3f41d9116cb609611d4d71` on `feat/analytics-login-profile-20261028` |
| Mobile branch | `feat/admin-mobile-20261028` (this work) |
| Mobile candidate SHA | c575fe0c5c5d1c664a3fb62e9ecae1de887ab9eb |

Analytics consent (login/profile, no global banner) is included via branching from `88a5b917`, not mixed into the same commit as mobile-only CSS/nav.

## Summary

- **Shell:** `AdminNav` with desktop inline links (721px+) and mobile «Разделы» `<dialog>` menu; active section label; safe-area padding on shell.
- **Partners:** bulk panel spacing on narrow viewports; 44px row actions; partnerships table horizontal scroll region.
- **Notifications / password:** stacked toolbars and form spacing on small widths; password page uses shared `adminPage` layout class.
- **FLOWS:** `artifacts/admin-mobile/FLOWS.md` — route matrix and verification checklist.

## Files (mobile)

- `src/app/admin/AdminNav.tsx` (new)
- `src/app/admin/AdminHeader.tsx`
- `src/app/admin/Admin.module.css`
- `src/app/admin/AdminMobileNav.test.tsx` (new)
- `src/app/admin/AdminPlatformControls.test.tsx` (pathname mock)
- `src/app/admin/AdminShellIsolation.test.tsx`
- `src/app/admin/partners/AdminPartners.module.css`
- `src/app/admin/partners/[id]/partnerships/AdminPartnerPartnershipsClient.tsx`
- `src/app/admin/notifications/AdminNotifications.module.css`
- `src/app/admin/password/page.tsx`
- `artifacts/admin-mobile/FLOWS.md`

## Commands & Vitest (representative)

```bash
npx vitest run --maxWorkers=1 src/app/admin/
npm run test:proxy
npm run build
```

## Browser evidence (real Chromium via Playwright CLI)

| Artifact | Provenance |
|----------|------------|
| `artifacts/admin-mobile/screenshots/login-375-light.png` | `playwright screenshot` @ `http://127.0.0.1:3011/login`, 375×812 |
| `artifacts/admin-mobile/screenshots/login-1440-light.png` | same @ 1440×900 |

Production server: `npm run build && npm run start -p 3011` on this branch.

## Not verified in browser (documented limits)

- Authenticated admin routes (`/admin/*`) require platform ADMIN session; not exercised end-to-end against production auth in this run.
- Dark theme screenshots and full 320/430/768 matrix pending follow-up capture with theme toggle + staff login fixture.
- JSDOM component tests cover nav dialog open/close and existing admin regressions; they do not replace full signed-in admin walkthrough.

## Regression scope

- Admin platform controls, shell isolation, mobile nav smoke, partners/notifications/moderation/overview unit tests under `src/app/admin/`.
- Analytics consent user-path tests on branch (included from `88a5b917`).
- Proxy allowlist: 295/295 pass.
