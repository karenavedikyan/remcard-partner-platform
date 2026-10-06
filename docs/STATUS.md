# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M3-A-fix-2: строгая валидация скидки без скрытого обрезания).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m3a-certificates-b3e3` (Draft PR #3, base M2) | M3-A + fixes |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only, без изменений |

## M3-A-fix-2: уточнённое правило процентов

- Общий % только из согласованных условий партнёрства (`poolPercent` в `available-partners`).
- PROF распределяет согласованный % между скидкой клиенту и вознаграждением; **без скрытого clamp** — превышение → ошибка, POST не уходит.
- UI: «Согласованный процент» (read-only), «Скидка клиенту» (edit), «Ваше вознаграждение» (auto).
- При превышении: сообщение + ссылка «Изменить условия партнёрства» → `/partners?terms=<partnershipId>`.
- Self-scan: 0–100%, issuer=0, без обрезания.

## Проверки

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | **68/68** |
| lint + build | ok |
| Unit: 5/10, 15/0, 20→error@15, negative, empty | ok |
| curl: pending term 20% → pool still 15%; after approve → 20%; create 7/13 | ok |
| Браузер: 21%@20 pool → error, value kept, link; 7% → 13% reward, create ok | ok |

## Фактические проценты (после term-change → 20%)

| Сценарий | Клиенту | PROF |
| --- | --- | --- |
| M1 Тестовая сеть, pool 20%, ввод 7% | 7% | 13% |
| Self-scan, ввод 7% | 7% | 0% |

## Ограничения

- Клиентские URL/QR — test-only (`127.0.0.1:3001`).
- Fixture JWT, не OAuth.
- Navigator без изменений.

## Не в scope

- Сканер, покупки, начисления (M3-B).
