# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M4-A: аудит готовности к запуску).

## SHA / ветки / PR

| Источник | SHA / ветка | PR |
| --- | --- | --- |
| M3-C (функциональный HEAD) | `e88f80b22598e5a69b3da1ff2e070d47a05ae4d6` · `cursor/m3c-history-b3e3` | Draft **#5** → base `cursor/m3b-scanner-b3e3` |
| M4-A (аудит) | ветка `cursor/m4a-launch-audit-b3e3` · base M3-C | Draft после push |
| Цепочка PR #1–#5 | M1 `e8f7e91` → M2 `0f1fa2c5` → M3-A `0960f776` → M3-B `ecc2fbd4` → M3-C `e88f80b` | #1–#5 open, не слиты |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only |

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
