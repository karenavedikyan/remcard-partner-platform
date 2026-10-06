# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M3-C fix: strict ID linking, purchase/bonus separation).

## SHA / ветки

| Источник | SHA / ветка | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` M3-C | ветка `cursor/m3c-history-b3e3` (Draft PR #5 → base `cursor/m3b-scanner-b3e3`) | fix после `8c7b365` |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only |

## M3-C fix: связи, разделение покупка/начисление, scope

### Исправления

- Связь purchase ↔ accrual **только** по `bonusId === accrual.id`; promoCode не используется для matching
- `findPurchaseByOrderId` — только issued-order по orderId; сканер без `?promo=`
- «Принято у меня»: `accepted-bonus` rows — номер/статус заказа отдельно от начисления; bonusId не показывается как № заказа
- Scope начислений из `GET /api/pro/wallet/balance` → `role`: MASTER/AGENT = «Начислено мне», STORE = «Вознаграждения профклиентам»
- `formatMoneyRub` — сохраняет копейки при дробных суммах
- Нет точной связи → «Все операции по документу» (фильтр списка), без ложной «связанной покупки»

### Проверки

#### Mock / unit — PASS (114/114)

`npm run test:proxy` — history-links regressions, history-format, filters, mappers

#### Integration (curl, loopback)

| Проверка | Результат |
| --- | --- |
| Prof wallet role MASTER | PASS |
| Store wallet role STORE | PASS |
| Staff pro/orders count=0, overlap=0 | PASS |
| Duplicate promo RC-95DDYO (2 orders) — API returns distinct ids | PASS (unit tests verify no promo mixing) |
| purchase → reload → history после нового POST | **NOT VERIFIED** |
| self-scan без начисления | **NOT VERIFIED** — нет fixture |
| terms change immutability | **NOT VERIFIED** |

#### Browser (desktop + mobile)

См. artifacts `m3c_fix_*` после fix-проверки.

### Оставшиеся пробелы API

- `bonus-list` / wallet tx без `orderId` — нельзя связать issued-order с accrual по ID
- `pro/orders` без line items
- Нет GET order/bonus by id
- Store partner после сканера: orderId может отсутствовать в списках → «Открыть покупку» показывает ограничение; «Все операции по документу» — отдельная ссылка

## Не в scope

Merge, deploy, выплаты, navigator changes, M3-D+
