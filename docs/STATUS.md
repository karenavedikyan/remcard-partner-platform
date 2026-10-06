# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M3-B fix: uncertain order, preview race, QR/camera).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m3b-scanner-b3e3` (Draft PR #4, base M3-A) | M3-B + fixes |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only, без изменений |

## M3-B fix (PR #4)

### Исправления

1. **Неопределённый результат покупки** — отдельное состояние `orderUncertain` с текстом «Результат неизвестен: покупка могла сохраниться»; кнопка подтверждения заблокирована для этой попытки; auto-retry POST нет. Ошибки валидации (4xx, клиент) сохраняют форму. Явно указан блокер: нет server idempotency.
2. **Гонка preview** — `PreviewSession { code, preview }`; `requestId` + `AbortController`; сброс/новый поиск инвалидирует in-flight; Enter/QR не запускают параллельный preview.
3. **Повреждённый QR** — `parseCertificateCode` без throw на `%ZZ`; понятная ошибка, повторный ввод.
4. **Камера** — generation token; отмена pending `start()` при unmount/переключении; поздние callbacks игнорируются.

### API (без изменений)

| Endpoint | Назначение |
| --- | --- |
| `POST /api/store/order/preview` | `{ certificateCode }` |
| `POST /api/store/order` | `{ certificateCode, items[] }` |

### Проверки

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | **89/89** (+11 scanner-flow, +malformed QR) |
| lint + build | ok |
| Unit: uncertain 504/500/0 vs 400 | ok |
| Unit: stale preview requestId, abort | ok |
| Integration curl (store preview/order) | ok (см. M3-B base) |
| Браузер desktop/mobile полный сценарий | см. artifacts после fix |
| Физическая камера | **не проверена** |

### Блокеры production

- **Нет idempotency key** на `POST /api/store/order` — UI блокирует повтор той же попытки, но не заменяет server-side guarantee.

### Ограничения

- Fixture JWT, тестовая БД `remcard_prof_test`
- Branch employee rights — не покрыты отдельным curl
- Navigator без изменений

## Не в scope

- M3-C, история, выплаты, production deploy
