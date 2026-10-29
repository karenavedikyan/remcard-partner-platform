# Coverage matrix: прототип → компонент → API → проверка

**Легенда статусов:** `BLOCKED-REF` нет эталона; `BLOCKED-API` нет/неизвестен backend route в этой среде; `EXISTING` есть в PROF baseline (не = visual R1); `TODO` после разблокировки; `OUT` R2/R3.

Прототипные пути ниже — **предположительные** имена экранов из задания, не сверенные с `current/admin/*.html`.

| # | Прототип (R1 promise) | Целевой компонент (план) | API mapping (известно из frontend BFF) | Проверка | Статус |
|---|----------------------|--------------------------|----------------------------------------|----------|--------|
| 1 | Оболочка / nav R1 | `src/components/admin-r1/shell/*` + `src/app/admin/layout.tsx` (owned) | session via existing auth; capabilities `GET /api/pro/admin/auth/capabilities` | 1440/375 light+dark; keyboard; R2/R3 hidden | BLOCKED-REF |
| 2 | Обзор | `admin-r1/overview` | `GET /api/pro/admin/management/overview?period=` | period chips; unavailable≠0 | EXISTING baseline / BLOCKED-REF parity |
| 3 | Реестр партнёров (4 типа) | `admin-r1/partners/registry` | `GET /api/pro/admin/partners/registry` + facets | paging/filter/facets/4 kinds; lifecycle independence | EXISTING baseline / BLOCKED-REF + type-unify dep |
| 4 | Карточка партнёра | `admin-r1/partners/card` | partnerships `GET .../partners/:id/partnerships`; lifecycle preview/apply; **нет полного card GET в allowlist** | permissions; confirmations | BLOCKED-API + BLOCKED-REF |
| 5 | Сотрудничество drilldown | reuse/adapt owned partners partnerships | same partnerships | status tabs | EXISTING |
| 6 | Lifecycle / archive actions | management panels | lifecycle + demo-supersession | confirm token; no prod QA writes | EXISTING |
| 7 | Модерация профилей/каталога | moderation queue + detail | `GET /api/pro/admin/moderation`; partner/org/branch approve\|reject\|revise; public-preview | submitted≠draft on approve | EXISTING / BLOCKED-REF |
| 8 | Модерация отзывов | `admin-r1/moderation/reviews` | queue `counts.reviews` есть; **action routes в allowlist не найдены** | permission tests | BLOCKED-API |
| 9 | Уведомления inbox | notifications client | notifications list/read/mark-all; unread-count | empty/error | EXISTING |
| 10 | Уведомления settings/bind | settings section | notification-settings GET/PATCH; bind status/start | bind≠delivery; no send QA | EXISTING |
| 11 | Клиенты | `admin-r1/clients` | overview.clients counts only; **list API неизвестен** | honest unavailable | BLOCKED-API |
| 12 | Сертификаты | `admin-r1/certificates` | admin list API неизвестен (partner cert APIs не staff) | cert≠deal unless model says | BLOCKED-API |
| 13 | Сделки | `admin-r1/deals` | неизвестен | same | BLOCKED-API |
| 14 | Базовая аналитика / RemScore | `admin-r1/analytics` | часть в management/overview; RemScore endpoint неизвестен | no fake trends | BLOCKED-API / partial EXISTING |
| 15 | Команда (StaffRole) | `admin-r1/team` | неизвестен в allowlist | existing roles only | BLOCKED-API |
| 16 | Журнал (audit) | `admin-r1/journal` | неизвестен | no secrets/PII excess | BLOCKED-API |
| 17 | Test users / password | keep existing routes | test-users + change-password | staff only | EXISTING (may be outside prototype R1 nav — уточнить по эталону) |
| 18 | R2 кураторы/задачи | — | — | must stay hidden | OUT |
| 19 | R3 новые расчёты | — | — | must stay hidden | OUT |

## Shared / integration blockers (не править молча)

| Path | Нужно для | Действие |
|------|-----------|----------|
| `src/lib/remcard-proxy.ts` | любые новые admin routes | `SHARED-CHANGE-REQUEST.md` |
| `src/lib/types.ts` / partner-kind helpers | единый primary kind | зависимость type-ветки; adapter only |
| Backend `/api/pro/admin/**` новые | card/reviews/clients/certs/deals/team/journal | backend task branch после доступа к navigator |

## Acceptance gates (после реализации)

- [ ] Visual parity screenshots vs reference (LOCAL FIXTURE marked)
- [ ] Playwright clicks/typing R1 screens; Escape/focus; no h-overflow
- [ ] Permission tests каждого нового route/action
- [ ] Registry paging+facets+4 types+lifecycle independence
- [ ] Submitted snapshot approve
- [ ] R2/R3 not activated
- [ ] `tsc --noEmit`, targeted tests, `npm run build`
- [ ] Backend targeted tests/typecheck с pre-existing blockers listed
