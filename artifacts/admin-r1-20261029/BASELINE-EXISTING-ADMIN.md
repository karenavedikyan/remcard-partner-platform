# Baseline: существующий PROF admin (до R1 reference-led)

Frontend tip: `1d9bbeb6332b68ba4421a299c1b6b5e3dfe8dd1e` (`release/prof-v1-20261007` / task branch start).

## Routes

| Route | Client | Notes |
|-------|--------|-------|
| `/admin` → overview | layout + redirect pattern | |
| `/admin/overview` | `AdminOverviewClient` | management overview periods |
| `/admin/partners` | `AdminPartnersClient` + registry/bulk/dense | 4 kinds facets; search; collaboration counts |
| `/admin/partners/[id]/partnerships` | partnerships list | not full partner card |
| `/admin/moderation` | queue | users/orgs/branches; reviews count field |
| `/admin/moderation/partners/[id]` | detail + preview + approve/reject/revise | submitted preview helpers |
| `/admin/moderation/organizations/[id]` | same for org/branches | |
| `/admin/notifications` | inbox + settings/bind | |
| `/admin/test-users` | test user tooling | |
| `/admin/password` | change password | |

Nav labels today: Обзор, Модерация, Партнёры, Уведомления, Тестовые пользователи, Пароль, Кабинет, Сайт RemCard. Нет: Клиенты, Сертификаты, Сделки, Аналитика, Команда, Журнал.

## BFF allowlist (`src/lib/remcard-proxy.ts`) — admin surface

Auth: capabilities, password-login, change-password.  
Test-users: list/create/patch/enter/reset/return.  
Partners: registry, partnerships, lifecycle preview/apply, demo-supersession preview/apply.  
Management: overview.  
Notifications: settings, bind status/start, list, unread-count, read, mark-all-read.  
Moderation: queue; partner/org detail; public-preview; approve/reject/revise (+ org approve-all); branch detail/actions.

## Gaps vs R1 promise (assignment)

- Visual shell/density/copy of prototype unknown without reference.
- Partner **card** as first-class screen: only partnerships + lifecycle management panels.
- Reviews **actions** not in frontend allowlist (only count).
- Clients / certificates / deals / team / journal / RemScore-specific analytics: no admin BFF entries in this repo.
- Release switcher / R1 gating UI: absent (correct until reference-led; must not become production R2/R3 toggle).

## Artifacts already present (prior passes, not this task)

`artifacts/admin-mobile`, `admin-management-metrics`, `admin-notify-messenger-subscriptions`, moderation UX packs — reuse as regression harnesses after R1 UI lands; do not treat as reference parity proof.
