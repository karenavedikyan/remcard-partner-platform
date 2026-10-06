# M4-D: полноценная история покупок и доступ сотрудников

Дата: 6 октября 2026 года.

## PR / ветки

| Репозиторий | Ветка | Base (M4-C.2) | Base SHA |
| --- | --- | --- | --- |
| remcard-navigator | `cursor/m4d-history-staff-b3e3` | `cursor/m4c2-client-idempotency-b3e3` | `698687564f28412282ab512d477695624afd90c5` |
| remcard-partner-platform | `cursor/m4d-history-staff-b3e3` | `cursor/m4c2-client-idempotency-b3e3` | `28cbd202389e0ce4a78e710abf50c2565525bb44` |

## Матрица прав (компактно)

| Актор | Preview | POST order | GET store/orders | GET store/orders/{id} | GET pro/orders | GET pro/orders/{id} | bonus-list | wallet |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Владелец STORE/COMPANY | OK (partner org owner row) | OK | Свои + staff `storeUserId` | То же | Если issuer | По `certificateOrdersWhereForProContext` | Legacy, только свои bonus | STORE owner |
| Branch staff | OK (parity с order) | OK | Только `storeUserId = self` | То же | Branch-scoped issuer | Branch-scoped | 403 (не STORE) | Owner wallet read-only |
| PROF-эмитент (solo/org) | N/A store | N/A | 403 | 403 | Свои рекомендации | По orderId + context | N/A | AGENT/MASTER |
| Посторонний STORE | denied | 400 | 404 чужих | 404 | — | — | — | — |
| Посторонний PRO | denied | 400 | 403 | 403/404 | 404 чужих | 404 | — | own only |

`userId` владельца, сотрудника и организации **не** взаимозаменяемы. Доступ строится через `getProContext` + сохранённые связи Order (`storeUserId`, `branchId`, certificate org/branch).

## API (новое / расширенное)

### GET /api/store/orders

Query: `limit` (default 20, max 50), `cursor` (`ISO8601|orderId`).

Response:

```json
{
  "orders": [{
    "orderId", "createdAt", "status", "totalAmount", "discountAmount", "payableAmount",
    "isSelfScan", "promoCode", "clientName", "proName", "storeName",
    "branchId", "branchName", "branchCity",
    "executorUserId", "executorName", "proBonus",
    "linkedAccruals": [{ "id", "type": "bonus" }]
  }],
  "pagination": { "limit", "hasMore", "nextCursor" }
}
```

### GET /api/store/orders/{orderId}

Detail + `items[]` с сохранёнными суммами/процентами. AgentBonus **не** отдаётся store endpoint.

### GET /api/pro/orders/{orderId}

Issuer detail + items + `linkedAccruals` (`bonus` | `agentBonus` по схеме).

### POST /api/store/order/preview

Branch staff: тот же `buildAcceptableStoreUserIds`, что и POST order.

### GET /api/store/bonus-list

Backward-compatible: добавлено поле `orderId` на каждой bonus-строке.

## Partner UI

- «Принято у меня» → `GET /api/store/orders` (accepted-order).
- Deep link `/history/purchases/{orderId}` → прямой fetch detail без предзагрузки списка.
- «Показать ещё» при `pagination.hasMore`.
- Начисления остаются отдельной вкладкой; связь purchase ↔ accrual только по `bonusId`.

## Сценарии приёмки

| ID | Ожидание | Факт | Доказательство | Статус |
| --- | --- | --- | --- | --- |
| A | Purchase → open → reload → history, один orderId | Partner E2E + integration | см. артефакты / тесты | PASS* |
| B | Self-scan в истории без bonus | Integration `isSelfScan` + empty linkedAccruals | vitest PG | PASS |
| C | Staff preview/order; owner видит staff order | preview unit + owner integration | vitest | PASS |
| D | Foreign store 404; foreign PRO 403/404 | integration foreign store | vitest PG | PASS |
| E | Исторические суммы не пересчитываются | items из OrderItem as stored | payload mapper | PASS |
| F | Два order на один promo — разные ID | idempotency regression untouched | M4-C.2 tests | PASS |
| G | Pagination без дублей/пропусков | cursor integration | vitest PG | PASS |
| H | M4-C.2 idempotency regression | route.idempotency.integration | vitest PG 21/21 | PASS |

\* A browser E2E — см. скриншоты после push; fixture JWT, не OAuth.

## Тесты / сборки

- navigator: `pnpm typecheck` PASS, `pnpm lint` PASS (warnings pre-existing), `pnpm build` PASS
- navigator tests: storeOrderAccess 5, preview staff 2, orders access integration 4, idempotency 21
- partner: `npm run test` 144/144 PASS, `npm run lint` PASS, `npm run build` PASS

## Ограничения

- Loopback `remcard_prof_test` — patched bootstrap, не production migrate chain.
- `GET /api/pro/orders` list по-прежнему max 200 без server pagination.
- Старые Order без `storeUserId` staff не переписываются; owner не увидит staff-покупки до M4-D, если `storeUserId` не staff/owner.
- Fixture JWT — не проверка OAuth.
