# M4-D final-fix: история покупок и доступ сотрудников

Дата: 6 октября 2026 года.

## PR / ветки / SHA

| Репозиторий | PR | Branch | Base | HEAD |
| --- | --- | --- | --- | --- |
| remcard-navigator | **Draft #675** | `cursor/m4d-history-staff-b3e3` | `cursor/m4c2-client-idempotency-b3e3` | после push |
| remcard-partner-platform | **Draft #8** | `cursor/m4d-history-staff-b3e3` | `cursor/m4c2-client-idempotency-b3e3` | после push |

## 1. Единые права филиалов (preview/POST = history)

`findAccessibleCertificatePartner` / `isAccessibleCertificatePartner` в `storeOrderAccess.ts`:

| Актор | certificatePartner |
| --- | --- |
| Owner | `storeUserId = ownerId` (любой `branchId`) |
| Branch staff | `storeUserId = org.ownerId` AND (`branchId = activeBranch` OR `branchId = null`) |
| Solo STORE | `storeUserId = userId` |

Используется в `POST /api/store/order/preview` и `POST /api/store/order`.  
`Order.branchId` **не** участвует. Идемпотентность и расчёты не менялись.

PG-тесты `route.branch.integration.test.ts`: свой филиал, чужой филиал (без Order/Bonus/usageCount), org-wide, владелец, чужая организация.

## 2. Состояния HistoryHub

- `acceptedAccessDenied` подключён к UI
- Store 403 → note «Принято у меня недоступны…», issued-orders остаются
- Пустой accepted → «Нет доступных покупок» + ограничение про старые записи
- Component: `HistoryHub.access-denied.test.tsx`

## 3. Сквозная приёмка (loopback, fixture JWT)

| Сценарий | Метод | Статус |
| --- | --- | --- |
| NEW purchase: scanner → confirm → detail → reload → history → accrual → back | Browser desktop/mobile | **PASS** |
| orderId `cmuxaajw0001jsb7wrctoayz`, promo `RC-M4D-E2E-1791327207225`, 1000/−100/900 | Browser | **PASS** |
| Staff allowed branch POST + owner sees in list | HTTP API | **PASS** |
| Idempotency replay same key → 1 order, usageCount +1 | HTTP API | **PASS** |
| Staff wrong branch preview/POST denied, no side effects | PG integration | **PASS** |
| Self-scan browser | — | **NOT VERIFIED** (PG only) |
| Staff wrong branch browser UI | — | **NOT VERIFIED** (PG + preview unit) |

Скриншоты: `m4d-new-purchase-desktop.png`, `m4d-new-purchase-mobile.png`.

## Проверки

| Контур | Результат |
| --- | --- |
| Navigator unit/PG (store + branch + idempotency) | 38+ PASS |
| Partner proxy + component | 146 PASS |
| Lint / typecheck / prod build (оба repo) | PASS |

## Ограничения

- Заказы без `certificatePartnerId` скрыты
- Store API не отдаёт AgentBonus
- Fixture JWT ≠ OAuth
