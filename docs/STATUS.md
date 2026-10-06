# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M4-D final-fix).

## SHA / ветки / PR

| Источник | SHA / ветка | PR |
| --- | --- | --- |
| M4-C.2 navigator | `698687564f28412282ab512d477695624afd90c5` · `cursor/m4c2-client-idempotency-b3e3` | Draft **#674** |
| M4-C.2 partner | `28cbd202389e0ce4a78e710abf50c2565525bb44` · `cursor/m4c2-client-idempotency-b3e3` | Draft **#7** |
| M4-D navigator | `cursor/m4d-history-staff-b3e3` · base M4-C.2 | Draft **#675** |
| M4-D partner | `cursor/m4d-history-staff-b3e3` · base M4-C.2 | Draft **#8** |
| Цепочка PR #1–#8 | M1 → … → M4-D | open, не слиты |

## M4-D (final-fix, Draft)

- Единые права филиалов preview/POST/history через `certificatePartner.branchId`
- HistoryHub: `acceptedAccessDenied`, обновлённые empty-notes
- Browser NEW purchase E2E + HTTP staff/owner/idempotency
- Отчёт: `docs/reviews/M4-D-history-staff.md`

## M4-A: вердикт готовности к запуску

**К запуску на pro.remcard.ru не готов.** Каркас M1–M3-C согласован (118/118 тестов на M3-C), но обязательны: вход через бота в кабинете, server idempotency покупки, минимальные правки history API (orderId для store, staff scanner).

Полный отчёт: **`docs/reviews/M4-A-launch-readiness.md`**

### Блокеры (кратко)

| # | Блокер | Объём |
| --- | --- | --- |
| B1 | Вход/регистрация PROF через бота (нет UI; consent не в BFF) | Средний |
| B2 | Idempotency `POST /api/store/order` + race maxUsages | Средний |
| B3 | `bonus-list` без `orderId` → store deep link broken | Небольшой |
| B4 | Branch staff: preview 403, owner history miss | Небольшой–средний |
| B5 | Schema bootstrap на пустой PG (не блокер live prod DB) | Крупный |

### Следующие задания

M4-B (login) → M4-C (idempotency) → M4-D (history API) → M4-E (launch runbook).

## M3-C (завершено в #5)

- История покупок/начислений; strict bonusId links; date labels; source warnings
- Приёмка A/B/C на loopback: PASS (+ API limitations documented)
- `npm run test:proxy` 118/118; lint PASS; build PASS (`NODE_ENV=production`)

## Не в scope M4-A

Реализация исправлений, merge/deploy, production, DNS, боты, navigator commits.
