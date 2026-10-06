# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M3-C завершение: подписи дат, предупреждения источника, приёмка A/B/C).

## SHA / ветки / PR

| Источник | SHA / ветка | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` M3-C | ветка `cursor/m3c-history-b3e3` → **Draft PR #5** (base `cursor/m3b-scanner-b3e3`) | финальный коммит после `e82a06f` |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only |

## M3-C: финальные исправления

### Подписи дат и фильтр периода

- `accepted-bonus` («Принято у меня»): поле `createdAt` подписано **«Дата начисления»** в списке и деталях
- `issued-order` («По рекомендациям»): **«Дата покупки»** из заказа
- Пояснение фильтра периода: для «Принято у меня» — по дате начисления; для «По рекомендациям» — по дате покупки

### Предупреждения по источнику (не по числу строк)

- Ограничение «Принято у меня» показывается, когда `GET /api/store/bonus-list` вернул 200 (`sources.acceptedBonusList`)
- При доступном источнике и 0 accepted-строк — пояснение: покупки без начисления могут отсутствовать; отсутствие записи ≠ доказательство, что покупка не сохранилась
- `history-loader` возвращает `{ purchases, accruals, sources }`

### Регрессии (unit)

`npm run test:proxy` — **118/118 PASS** (добавлены `history-labels.test.ts`, `history-sources.test.ts`)

### Lint / build

- `npm run lint` — PASS
- `NODE_ENV=production npm run build` — PASS (в окружении агента `NODE_ENV` по умолчанию нестандартный — для CI использовать `production`)

## Приёмка A/B/C (loopback :3000 → :3001, fixture JWT)

| Сценарий | Ожидание | Факт | Доказательство | Статус |
| --- | --- | --- | --- | --- |
| **A. Новая покупка → reload → история** | Order в `pro/orders` у PROF; bonus-row в `bonus-list` у STORE; суммы совпадают; STORE не находит покупку по `orderId` | Order `cmux4d4pk0009js0w5j7kzg4v`: 920₽, disc 46, bonus 92, promo RC-95DDYO — в обоих API; STORE `/history/purchases/{orderId}` — not-found с корректным сообщением | curl BFF; UI: `m3c_final_purchase_issued_detail.png`, `m3c_final_purchase_accepted_detail.png`, `m3c_final_purchase_order_not_found_store.png` | **PASS** (+ **ограничение API**: bonus-list без orderId) |
| **B. Самосканирование** | Нет Bonus в БД; нет начисления в wallet/UI; покупка может отсутствовать в bonus-list | Order `cmux4dzwa000qjs0w8hnf7god`: isSelfScan, proBonus=0; bonus-list count=0 для RC-FPYLN1; wallet tx пусто | curl BFF; UI: self-scan в списке STORE как issued-order «Дата покупки», без начисления | **PASS** (БД: **NOT VERIFIED** — psql недоступен; косвенно: bonus-list + wallet) |
| **C. Неизменность истории после term-change** | Старые суммы/проценты заказа и начисления не меняются после согласования новых terms | До/после approve term-change doors 20%→25%: order 920/46/92 и bonus items 10%/92₽ без изменений; terms doors=25% | curl до/после `POST term-change` + `respond approve`; wallet tx id `cmux4d4pp000cjs0wfvrzspci` unchanged | **PASS** |

### Browser (desktop + mobile)

Artifacts `m3c_final_*`: список STORE/PROF, детали accepted/issued/accrual, mobile 390px, not-found по orderId для STORE.

## Оставшиеся пробелы API (не обходим)

- `bonus-list` без `orderId` — deep link из сканера для STORE-partner → not-found (корректное сообщение)
- `bonus-list` не включает самосканирование и покупки без Bonus
- `pro/orders` без line items и `bonusId` — связь issued-order ↔ accrual по ID невозможна
- Нет GET order/bonus by id — детали через полный список
- Нет server-side search/pagination

## Блокеры боевого запуска

- Idempotency-Key на `POST /api/store/order`
- OAuth/callback и temp cookies через BFF
- Production DNS / боты / платные ресурсы — вне scope
- Merge/deploy M3-C — **не выполнен** (Draft PR #5 открыт)

## Не в scope

Navigator schema/миграции, выплаты, M3-D+
