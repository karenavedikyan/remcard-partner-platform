# History focus UI — изолированная приёмка (QA)

Отдельная ветка **`qa/r1-history-focus-ui-20261110`**, без изменений продуктовых путей рантайма. Продуктовый UI: `release/r1-history-focus-ui-20261110` (tip `f3386725`).

Стенд покупок (`purchases.html`) **не** покрывает `HistoryHub` / `AccrualDetail` — для history focus используйте этот harness.

## Запуск

```bash
npx vite --config scripts/reward-lifecycle-qa/history.config.ts
```

Открыть: http://127.0.0.1:5199/history.html

- Только **GET**; остальные методы → `405`.
- Данные **синтетические** (middleware Vite), live API не подключается.
- Рендерятся **реальные** `HistoryHub`, `AccrualDetail`, `PurchaseDetail`.

## Сцены (`qaScene` на API-запросах)

Сцена выбирается в UI (select). Она прокидывается в query `qaScene` для всех `/api/remcard/*` fetch.

| Сцена | Поведение |
|--------|-----------|
| `default` | Покупки (store) + начисления 0 ₽ и 5 400 ₽ |
| `store-403` | Accepted store orders → 403; issued pro order в списке |
| `history-error` | Store/pro orders и settlements → 500 |
| `pagination` | Первая страница accepted + `hasMore` |
| `accrual-zero-only` | Только payable 0 ₽ |

## Навигация

Компоненты используют пути Next (`/history`, `/history/accruals/:id?type=`, `/history/purchases/:id`). Harness перехватывает клики и мапит в **hash**:

- `#/history` — хаб
- `#/history?search=<promo>` — фильтр (через `initialPromoCode`)
- `#/history/accruals/<id>?type=bonus|agentBonus` — деталь начисления
- `#/history/purchases/<orderId>` — покупка (focus `PurchaseDetail`)

## Быстрые ссылки (после старта)

- Хаб: `http://127.0.0.1:5199/history.html#/history`
- Нулевое начисление: `...#/history/accruals/qa-accrual-zero?type=bonus`
- Агентское: `...#/history/accruals/qa-accrual-agent?type=agentBonus`
- Покупка: `...#/history/purchases/<orderId из purchase-fixtures>`

## Параллельно со стендом покупок

Покупки (сертификаты): порт **5198**, `purchases.config.ts`.  
История: порт **5199**, `history.config.ts`.
