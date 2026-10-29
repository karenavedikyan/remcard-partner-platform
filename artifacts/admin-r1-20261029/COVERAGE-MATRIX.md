# Coverage matrix: прототип R1 → компонент → API → проверка

Источник эталона: `reference/prototype-20261029` @ `4ba2f9e764b412e956e2ccb619ebbcab7d76a006` (`docs/prototype-reference/current/admin/`, DEMO.releases id=1).

| # | Прототип (R1) | Компонент | API mapping | Проверка | Статус |
|---|---------------|-----------|-------------|----------|--------|
| 1 | Оболочка / nav R1 (tasks скрыты) | `src/components/admin-r1/AdminR1Shell.tsx` + `admin-r1-shell.css` | session via existing auth | 1440/375 light+dark LOCAL FIXTURE; R2 tasks hidden | DONE |
| 2 | Обзор | existing `src/app/admin/overview/*` в shell R1 | `GET /api/pro/admin/management/overview` | period chips; unavailable≠0 | EXISTING + shell |
| 3 | Реестр 4 типов | existing `src/app/admin/partners/*` | `GET /api/pro/admin/partners/registry` + facets | paging/filter/facets; type-unify dep | EXISTING; kind dep |
| 4 | Карточка партнёра | `src/app/admin/partners/[id]/*` | `GET /api/pro/admin/partners/:id/card` | permissions; statuses independent | DONE |
| 5 | Партнёрства drilldown | existing partnerships page | `GET .../partnerships` | status tabs | EXISTING |
| 6 | Lifecycle actions | existing management panels | lifecycle preview/apply | confirm token; no prod QA writes | EXISTING |
| 7 | Модерация профилей/каталога | existing moderation | `GET/POST /api/pro/admin/moderation/**` | submitted≠draft on approve (existing) | EXISTING |
| 8 | Модерация отзывов | `moderation/reviews` + results tab | `GET /api/pro/admin/moderation/reviews`; POST approve/reject | UI read-only in LOCAL QA | DONE (actions not auto-fired) |
| 9 | Уведомления inbox/settings | existing notifications | notifications + bind/settings | bind≠delivery; no send QA | EXISTING |
| 10 | Клиенты | `src/app/admin/clients/*` | `GET /api/pro/admin/clients` | empty/error; no fake stages | DONE |
| 11 | Сертификаты | results tab certs | `GET /api/pro/admin/certificates` | cert≠deal unless Order | DONE |
| 12 | Сделки | results tab deals | `GET /api/pro/admin/deals` (= Order) | honest mapping | DONE |
| 13 | RemScore / результативность | `src/app/admin/results/*` | `results/summary`, `results/remscore` | no R2 success coeff | DONE |
| 14 | Базовая аналитика | `src/app/admin/analytics/*` | `GET /api/pro/admin/analytics` | error≠zeros; geography R2 hidden | DONE |
| 15 | Команда StaffRole | `src/app/admin/team/*` | `GET /api/pro/admin/team` | no curators/tasks | DONE |
| 16 | Журнал | settings → audit | `GET /api/pro/admin/journal` (AuditLog) | no secrets/meta dump | DONE |
| 17 | R2 tasks/curators/global search | — | — | must stay hidden | OUT / HIDDEN |
| 18 | R3 types/factories | settings note | — | not activated | OUT / HIDDEN |

## Gaps vs prototype promise (честно)

- Client «стадии» new/contact/order/done прототипа **не** в модели User → UI не рисует синтетические stages.
- Certificate list API без server `periodDays` → клиентский фильтр по странице + note.
- RemScore list берёт до 500 PRO для kind filter in-memory (documented in API note).
- Visual parity: LOCAL FIXTURE shell screenshots; полный browser QA против live PROF **не** утверждается без staff auth.
- Type-unify ветка не merge — registry kind через DTO `partnerKind` / adapter labels.
