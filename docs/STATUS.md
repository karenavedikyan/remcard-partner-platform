# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M3-A-fix: расчёт процентов, ошибки формы, партнёр programReady).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m3a-certificates-b3e3` (Draft PR #3, base M2) | M3-A + fix |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only, без изменений |
| Прототип | https://pro.remcard.ru/ | Design tokens |

## M3-A-fix: исправления

- [x] Расчёт `issuerPercent = poolPercent - discountPercent` как в `CertificateWizard.updateCategoryPercent` (не self-scan).
- [x] Self-scan: только скидка клиенту, `issuerPercent=0`.
- [x] UI показывает согласованный %, скидку клиенту и вознаграждение PROF до отправки.
- [x] Валидация без unhandled rejection: field errors + form error, POST не уходит при ошибке.
- [x] Seed `scripts/local/seed-m3a-partner-ready.sql.example`: филиал + 15% по «Двери» → `programReady: true` для `M1 Тестовая сеть`.
- [x] Unit-тесты расчёта и payload (`certificate-percent.test.ts`).

## M3-A: реализовано (база)

- [x] Список, создание, карточка, ссылка, PDF (`/recommendations/*`).
- [x] BFF allowlist для certificate routes.

## Проверки M3-A-fix

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | **63/63** |
| lint + build | ok |
| curl: partner 5%/10% create | 201, saved 5% + 10% |
| curl: self-scan 7% | issuerPercent=0 |
| curl: outsider detail | 404 |
| public JSON RC-ZVKDI7 | discount 5%, без issuerPercent |
| PDF RC-95DDYO | RC-95DDYO, срок, QR → `127.0.0.1:3001/certificate/RC-95DDYO/add` |
| Браузер: 15% pool, 5/10 preview, validation, create, list, mobile | ok, без console errors |

## Фактические проценты (синтетика)

| Сценарий | discountPercent | issuerPercent |
| --- | --- | --- |
| M1 Тестовая сеть (15% pool, клиенту 5%) | 5 | 10 |
| Self-scan M1 Мастер PROF (клиенту 7%) | 7 | 0 |

## Ограничения

- Клиентская ссылка/QR в тесте: `127.0.0.1:3001` — test-only, не для реальных клиентов.
- Fixture JWT, не OAuth.
- Navigator baseline на пустой PostgreSQL — блокер M1 (не снят).

## Не в scope

- Сканер, покупки, начисления (M3-B и далее).
