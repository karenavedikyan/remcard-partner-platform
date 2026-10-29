# Admin R1 — FLOWS (черновик до эталона)

**Источник состава эталона недоступен.** Этот файл — каркас из задания + существующего PROF admin. После worktree `docs/prototype-reference/current/admin/` (SHA `4ba2f9e…`) заменить на точные подписи/шаги/диалоги из HTML/JS.

## Release gating

| Release | Scope promise (из задания) | Статус в production PROF |
|---------|----------------------------|--------------------------|
| R1 | Базовый кабинет: реестр/карточка, модерация профилей+отзывов, уведомления, обзор, клиенты, сертификаты, сделки, базовая аналитика, команда (StaffRole), журнал; RemScore | **Не перенесено** (blockers) |
| R2/R3 | Кураторы, задачи, новые расчёты и пр. | **Не активировать**; переключатель релизов эталона ≠ production feature flag |

## Requested flows (R1) — expected verification

| ID | Flow | Precondition | Steps (ожидаемые) | Success | Regression |
|----|------|--------------|-------------------|---------|------------|
| F01 | Staff login `?mode=admin` | Platform staff credentials | Login → admin shell | Staff session; partner/org не видят admin data | Partner login isolation |
| F02 | Nav shell R1 | Staff session | Desktop 1440 + mobile 375; light/dark; Escape/focus trap в меню | Только R1 разделы; плотность как эталон | R2/R3 hidden |
| F03 | Реестр партнёров | Staff | 4 типа facets, search, pagination, независимые registration/catalog/collaboration/archive | Counts согласованы; пусто/ошибка честно | Type-unify dependency |
| F04 | Карточка партнёра | Staff + partner id | Сведения, связанные сущности, доступные actions + confirm | Server 401/403; no wallet в staff context | Lifecycle independence |
| F05 | Модерация профилей/каталога | Pending submitted | Preview submitted snapshot → approve/reject/revise + confirm | Approve публикует submitted, не draft | Existing moderation routes |
| F06 | Модерация отзывов | Pending reviews | Queue + decision | Auth-protected; no live QA writes | counts.reviews в queue |
| F07 | Уведомления | Staff messenger bindings | Inbox, settings, bind status | Link-check ≠ delivery; send не в QA | Existing notify APIs |
| F08 | Обзор | Staff | Period filters, metrics from real fields | Unavailable → explicit, не 0 | management/overview |
| F09 | Клиенты | Staff | List/filters mapped to backend clients | Honest empty/unavailable | — |
| F10 | Сертификаты | Staff | Не каждый сертификат = сделка | Mapping from existing model | — |
| F11 | Сделки | Staff | Только если модель подтверждает | Unavailable иначе | — |
| F12 | Аналитика / RemScore | Staff | Existing RemScore only | No synthetic trends | — |
| F13 | Команда | StaffRole existing | List/roles per current auth model | No new memberships/impersonation | — |
| F14 | Журнал | Audit source | Allowed fields, no secrets/excess PII | GET no side effects | — |

## Touched regression (existing PROF admin)

После реализации R1 проверить неломаемость: partners registry filters/bulk confirm, moderation preview/confirm dialogs, notifications bind UI, overview period chips, admin mobile nav dialog, login admin mode.

## Out of scope

Deploy, merge release/main, DB migrations, production moderation/send/team changes, Seda/ОПТОВИК partnership mutation, R2/R3, partner routes/components.
