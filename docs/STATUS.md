# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M3-B fix-2: QR onCode, malformed 201 order response).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m3b-scanner-b3e3` (Draft PR #4, base M3-A) | M3-B + fixes |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only, без изменений |

## M3-B fix-2 (PR #4)

### Исправления

1. **QR → preview** — `onCode` вызывается до `stopCamera()`; dedup/stale generation в `processQrDecode`.
2. **Повреждённый 201 order** — `validateOrderCreateResponse` перед success UI; пустой/битый JSON/неверная структура → `orderUncertain`, повтор заблокирован.
3. **UI uncertain** — «Покупка могла сохраниться. Не подтверждайте её повторно до проверки.» (без технических деталей idempotency в интерфейсе).

### Проверки

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | **99/99** |
| lint + build | ok |
| Unit: QR emit once, dedup, after close | ok |
| Unit: order 201 broken/empty/valid, 400 editable | ok |
| Браузер desktop/mobile | см. artifacts m3b_fix2_* |
| Физическая камера | **не проверена** (QR логика покрыта unit-тестами) |

### Блокеры production

- **Нет idempotency key** на `POST /api/store/order` — UI блокирует повтор попытки, но не заменяет server-side guarantee (см. REUSE-MAP.md).

## Не в scope

- M3-C, история, выплаты, production deploy
