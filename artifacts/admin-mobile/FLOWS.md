# PROF admin mobile — flows & verification matrix

Base branch: `feat/admin-mobile-20261028` (from analytics `88a5b917`). Production base: `d6de8c5f`.

## Route tree

| Route | Primary actions | Mobile checks (375 / 430 / 320) | Desktop regression (1440) |
|-------|-----------------|----------------------------------|---------------------------|
| `/admin/overview` | Period chips, metric cards, chart blocks, drill-down links | No horizontal page scroll; cards stack; period chips wrap; tap targets ≥44px | Grid unchanged; no new horizontal scroll |
| `/admin/partners` | Search, filters, metrics chips, table/cards toggle, selection, bulk panel, per-row management | Filters single column; cards readable; bulk panel not overlapping last card; management + confirm dialog scroll | Table mode + bulk unchanged |
| `/admin/partners/[id]/partnerships` | Status tabs, list, pagination, back link | Long names wrap; table in labeled scroll region if wide | Full table visible |
| `/admin/moderation` | Search, filters, queue table/cards | Cards on narrow; filters stack | Table visible |
| `/admin/moderation/partners/[id]` | Decision forms, preview modals, reasons | Modals fit viewport; actions reachable | Desktop modals unchanged |
| `/admin/moderation/organizations/[id]` | Same as partner detail | Same | Same |
| `/admin/notifications` | Inbox, unread filter, mark read, settings, bind MAX/TG | Toolbar wraps; settings fieldsets stack | Layout intact |
| `/admin/test-users` | List, enter/reset, password panel | Forms 16px inputs; actions separated | Unchanged |
| `/admin/password` | Change password form | Submit visible with keyboard | Unchanged |

## Shell (all routes)

- Compact «Разделы» menu on ≤720px; desktop inline nav from 721px.
- Dialog: Escape, backdrop click, «Закрыть», focus return to opener.
- Account menu, theme toggle, notification bell remain reachable.
- Active section label visible on mobile.

## Themes & widths

- Light + dark on each sampled page at 375 and 1440.
- Spot checks: 320, 430, 768 landscape on partners + moderation queue.

## Out of scope (this pass)

- Real authenticated production admin data.
- Backend/API changes.
- New business rules for moderation/partners.

## Automated regression (Vitest)

- Existing: admin shell/theme, partners registry/bulk/search, partnerships, overview, moderation dialogs, notifications, login/consent, proxy allowlist.
- New: `AdminMobileNav.test.tsx` (menu a11y smoke).

## Browser evidence

- Local dev server + synthetic/isolated UI states where auth required; screenshots under `artifacts/admin-mobile/screenshots/` with width/theme in filename.
