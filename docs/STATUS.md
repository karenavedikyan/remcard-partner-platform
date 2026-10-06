# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M3-B: сканер и подтверждение покупки).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m3b-scanner-b3e3` (Draft PR, base M3-A) | M3-B scanner + purchase |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only, без изменений |

## M3-B: сканер и покупка

### Реализовано

- Маршрут `/scanner`, пункт навигации «Сканер»
- QR (`html5-qrcode`, задняя камера, dedup, stop on unmount) и ручной ввод
- `extractCertificateCode` — URL remcard/localhost/path/promo, без fetch QR-ссылок
- Preview → форма → «Подтвердить покупку» → экран успеха
- Сумма **до скидки, ₽**; скидка/бонус — сервер (`Math.round`)
- Сообщение при неопределённом результате POST order
- Блок «Где действует документ» (partnerCards из preview)

### API (через BFF)

| Endpoint | Назначение |
| --- | --- |
| `POST /api/store/order/preview` | Предпросмотр, `{ certificateCode }` |
| `POST /api/store/order` | Создание покупки, `{ certificateCode, items[] }` |

### Проверки

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | **78/78** (+10: certificate-code, order-totals, order allowlist) |
| lint + build | ok |
| Unit: extract URL/promo, totals 5%/10% @1000₽ | ok |
| Integration curl: promo vs qrCode preview | same RC-ZVKDI7 |
| Integration: preview не создаёт Order | ok (count 0→1 только после POST order) |
| Integration: store @ RC-ZVKDI7, 1000₽ | disc 50, bonus 100, Order+Bonus CALCULATED |
| Integration: staff (m1fix-staff) preview | `allowed: false` |
| Integration: self-scan RC-AK9RLB | bonus 0, Bonus row 0 |
| Браузер desktop | landing + manual field (после fix default manual) |
| Браузер mobile preview/confirm/success | см. артеfacts / повтор после fix |
| Физическая камера | **не проверена** (cloud VM) |

### Защита от дублей

- **Backend:** idempotency key **отсутствует** на `POST /api/store/order` — **блокер безопасного production-выпуска**
- **Клиент:** блокировка кнопки во время запроса; без auto-retry POST; сообщение UNCERTAIN_ORDER_MESSAGE

### Ограничения

- Fixture JWT (`m1fix-store` / `m1fix-prof` / `m1fix-staff`), не OAuth
- Тестовая БД `remcard_prof_test` на loopback
- Права branch employee через org owner — **не покрыты отдельным curl** (логика в navigator `getProContext`)
- Navigator без изменений

## M3-A (base PR #3)

- Рекомендации: list/create/card/link/PDF; строгая валидация скидки без clamp
- 68 тестов на base; M3-B добавляет 10

## Не в scope M3-B

- История операций, выплаты, баланс, ledger UI
- Production deploy, боты, real OAuth
