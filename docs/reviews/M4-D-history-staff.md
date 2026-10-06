# M4-D fix: история покупок и доступ сотрудников

Дата: 6 октября 2026 года (fix-pass).

## PR / ветки

| Репозиторий | PR | Ветка | Base (M4-C.2) |
| --- | --- | --- | --- |
| remcard-navigator | **Draft #675** | `cursor/m4d-history-staff-b3e3` | `cursor/m4c2-client-idempotency-b3e3` @ `6986875` |
| remcard-partner-platform | **Draft #8** | `cursor/m4d-history-staff-b3e3` | `cursor/m4c2-client-idempotency-b3e3` @ `28cbd20` |

Итоговые SHA — см. git log после push fix-pass (обновляются в STATUS).

## Доказательство принадлежности покупки магазину

Принадлежность **не** выводится из текущего состава сотрудников (`storeUserId IN staff`).

| Поле | Смысл | Использование в доступе |
| --- | --- | --- |
| `Order.storeUserId` | Исполнитель (кто провёл операцию) | Staff: дополнительный фильтр «только свои»; owner: **не** используется для принадлежности |
| `Order.certificatePartnerId` → `certificatePartner.storeUserId` | Принимающий партнёр (магазин/организация на момент покупки) | **Основной критерий** для owner и solo STORE |
| `certificatePartner.branchId` | Филиал принимающей стороны | Staff: scope по `activeBranch`; `branchId = null` — org-wide |
| `Order.branchId` | Может отражать филиал эмитента (копия из Certificate) | **Не используется** для store history |

Правила (`buildStoreOrderAccessWhere`):

- Owner: `certificatePartner.storeUserId = ownerId`, `certificatePartnerId IS NOT NULL`.
- Branch staff: `storeUserId = self` + `certificatePartner.storeUserId = org.ownerId` + branch filter на `certificatePartner.branchId`.
- Solo STORE/COMPANY: `certificatePartner.storeUserId = userId`.
- Без `certificatePartnerId` — запись **не раскрывается** (404/403), даже если executor известен.

## Таблица исправлений (fix-pass)

| # | Проблема | Исправление | Тесты |
| --- | --- | --- | --- |
| 1 | Owner видел чужие покупки через roster staff после перевода | Фильтр по `certificatePartner.storeUserId` | PG: transfer A→B, removed staff, foreign owner, branch isolation, list+detail |
| 2 | Staff `partnerType=null` не видел историю | `history-loader` всегда пробует store API, 403 → флаг, не пустой список | unit proxy + browser staff session |
| 3 | `agentBonus` терялся; только первый bonusId | `linkedAccruals[{id,type}]` end-to-end; wallet `orderId`+`accrualType` | history-links/mappers tests |
| 4 | «Показать ещё» скрывалась при пустом фильтре | Кнопка по `nextCursor`; note «В загруженных покупках совпадений нет» | `HistoryHub.pagination.test.tsx` + PG pagination 7 orders |
| 5 | Обратная ссылка accrual→purchase только по первой странице | `AccrualDetail` → `fetchPurchaseByOrderId(row.orderId)` | browser round-trip |
| 6 | Browser detail 500 (dev/prod смешение) | Prod build обоих repo, `NODE_ENV=production`, порты 3000/3001 | browser E2E 6/6 PASS |

## Матрица прав (компактно)

| Актор | GET store/orders | GET store/orders/{id} | GET pro/orders/{id} | wallet |
| --- | --- | --- | --- | --- |
| Org owner | По `certificatePartner.storeUserId` | То же + id | Если issuer | STORE |
| Branch staff (incl. partnerType=null) | Self executor + org owner partner + branch | То же | Branch-scoped issuer | Owner read-only |
| Solo STORE | certificatePartner = self | То же | 403 | STORE |
| Foreign store | 404 | 404 | — | — |
| Removed staff | 403 | 403 | — | — |

Preview/POST order — без изменений (M4-C.2).

## API (без расширения scope M4-D)

- `GET /api/store/orders` — cursor pagination; `linkedAccruals: [{id, type:"bonus"}]` (AgentBonus **не** на store side).
- `GET /api/pro/orders/{orderId}` — `linkedAccruals` включает `agentBonus`.
- `GET /api/pro/wallet/transactions` — добавлены `orderId`, `accrualType` (`bonus`|`agentBonus`).

## Partner UI

- «Принято у меня» — `GET /api/store/orders`; доступ решает backend, не `isStoreLikePartner`.
- Deep link `/history/purchases/{orderId}` — store detail, fallback pro detail.
- «Показать ещё» — при `nextCursor`, даже если фильтр пуст на загруженных строках.
- Связи purchase ↔ accrual — только `{id, type}`; self-scan без ссылок.

## Результаты проверок

| Контур | Команда | Результат |
| --- | --- | --- |
| Navigator unit | `pnpm vitest run src/lib/store/__tests__/storeOrderAccess.test.ts` | PASS (6) |
| Navigator PG access | `route.access.integration.test.ts` | PASS (8) |
| Navigator PG idempotency | `route.idempotency.integration.test.ts` | PASS (19) |
| Navigator lint/typecheck | `pnpm lint`, `pnpm typecheck` | PASS (warnings pre-existing) |
| Navigator build | `NODE_ENV=production PLATFORM_INN=… PLATFORM_OGRN=… pnpm build` | PASS |
| Partner unit/proxy | `npm run test:proxy` | PASS (139) |
| Partner component | `npm run test:component` | PASS (5, incl. pagination) |
| Partner lint/typecheck/build | `npm run lint`, `tsc`, `NODE_ENV=production npm run build` | PASS |
| Browser E2E (loopback) | fixture JWT, prod servers :3000/:3001 | **PASS 6/6** |

### Browser (fixture JWT, не OAuth)

| Сценарий | Статус |
| --- | --- |
| History list loads | PASS |
| Purchase detail by orderId (desktop) | PASS — screenshot `m4d-detail-desktop.png` |
| Reload detail | PASS |
| Purchase detail (mobile 390px) | PASS — screenshot `m4d-detail-mobile.png` |
| Accrual link + back to purchase | PASS |
| Order in history list | PASS |
| Self-scan / staff isolation / idempotency reload | NOT VERIFIED in browser (покрыто PG/API) |

## Ограничения

- Заказы **без `certificatePartnerId`** не показываются — безопаснее, чем предположительный доступ; миграция не добавлялась.
- `GET /api/pro/orders` list — max 200, без server pagination.
- Store API не отдаёт AgentBonus (контракт сохранён).
- Loopback `remcard_prof_test` — patched bootstrap, не production migrate chain.
- Fixture JWT — не проверка OAuth.
