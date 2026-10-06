# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M3-C: история покупок и начислений).

## SHA / ветки

| Источник | SHA / ветка | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` M3-C | ветка `cursor/m3c-history-b3e3` (Draft PR → base `cursor/m3b-scanner-b3e3`) | от `ecc2fbd` (PR #4) |
| `remcard-partner-platform` M3-B | `ecc2fbd` на `cursor/m3b-scanner-b3e3` (Draft PR #4) | Scanner + fixes |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only |

## M3-C: История покупок и начислений

### Реализовано

- Навигация «История», вкладки **Покупки** / **Начисления**
- Источники: `GET /api/store/bonus-list` (принято у меня), `GET /api/pro/orders` (по рекомендациям), `GET /api/pro/wallet/transactions` (начисления)
- Клиентские фильтры: поиск, статус, период, направление (если обе стороны в данных)
- Детали покупки и начисления; связь по promoCode / bonusId
- Сканер: ссылка «Открыть покупку» после успешного order 201
- BFF allowlist расширен; выплаты / POST bonus pay **не добавлены**

### Проверки

#### Mock / unit (`npm run test:proxy`)

| Проверка | Результат |
| --- | --- |
| Всего тестов | **108/108 PASS** |
| history-filters, history-mappers | PASS |
| remcard-proxy allowlist (bonus-list, pro/orders, wallet) | PASS |
| lint + build | ok |

#### Интеграционные (curl, loopback, fixture JWT)

| Проверка | Результат |
| --- | --- |
| Store `bonus-list` через BFF | PASS — bonuses с orderItems, суммы |
| Prof `pro/orders` через BFF | PASS — order.id, proBonus, promoCode |
| Prof `wallet/transactions` через BFF | PASS — amount/status/items по RC-95DDYO |
| Согласованность order ↔ accrual (700/−35/70) | PASS |
| BFF блокирует `/api/admin/secret` | PASS — 403 |
| Посторонний PRO (staff JWT) — изоляция чужих операций | **NOT VERIFIED** — staff получает 200 на pro/orders; нужен отдельный fixture без контекста |
| Самоскан без лишнего начисления | **NOT VERIFIED** — нет self-scan fixture в текущих данных |
| Изменение terms не меняет историю | **NOT VERIFIED** — сценарий не прогонялся в этой сессии |
| purchase → reload → history после нового POST | **NOT VERIFIED** — использованы существующие записи M3-B |

#### Браузер (desktop + mobile, fixture JWT)

| Проверка | Результат |
| --- | --- |
| /history — вкладки, фильтры, список | PASS |
| Детали покупки (суммы 700/35/665/70) | PASS |
| Детали начисления + позиции | PASS |
| Mobile 390px — список | PASS |
| Nav «История» | PASS |
| Скриншоты | `m3c_history_*`, `m3c_nav_history_link.png` |

### Ограничения / пробелы

- Поиск и фильтры — **только по загруженным записям** (до 200 issued orders)
- `pro/orders` без line items — детали issued показывают только суммы заказа
- `bonus-list` без orderId — deep link из сканера использует orderId + fallback promo
- Самоскан: покупка может отсутствовать в bonus-list; начисление скрыто
- Нет server pagination / order detail API

## Не в scope

- Выплаты, изменение статусов, возвраты, ledger
- Production deploy / merge
- M3-D и далее
