# RemCard mini-app parity — отчёт (изолированная ветка)

## Базовые SHA (Timeweb, проверены локально)

| Слой | Репозиторий | Базовый commit |
|------|-------------|----------------|
| FE | `remcard-partner-platform` | `c457512f4051166d5f9a74201666736c4e15dbac` |
| BE | `remcard-navigator` | `5f11f3cc964158cff4a276476702c2d51ff4626c` |

Рабочая ветка (оба репозитория): `cursor/remcard-mini-app-telegram-max-parity-d461`.

Исходный пилот: `artifacts/mini-app-pilot-20261122/ACCEPTANCE.md` @ FE `c457512f`.

## Что сделано в этой итерации

| Область | Было (пилот) | Стало |
|---------|--------------|-------|
| Сканер mini-app | Только read-only verify (`MiniAppScanVerify` + `GET /api/pro/mini-app/scan`) | `MiniAppScanReceive`: verify → CRM certificate-entry (как full cabinet) → preview/order → привязка order-link |
| Скидки / пул | FE без жёсткого пула; BE допускал client % выше пула (PROF=0) | Отказ при превышении пула на 0,01 п.п.; FE «Максимум по категории»; BE `prepareStoreOrderItems` + live pool в транзакции |
| Сертификат готов | QR + код | + клиентский просмотр, share, PDF, ссылка, условия, срок |
| Кошелёк | Суммы без PAN | Показ `cardIdentifier`; retry bootstrap; ссылка на settlements |
| Филиал | scan без branch-pick | `scan_qr` как create — выбор точки при нескольких филиалах |

## Не проверено / остаётся

- E2E Telegram/MAX WebView, живая камера, staging DB
- Пиксель-перфект с master preview `8894510b-c1a4-4683-be6c-b68683915743` (без доступа к canvas в этом прогоне)
- Полный UI весовых скриншотов 320/390/1440 — запуск `mini-app-visual-capture.mjs` после `npm run dev`
- Агент по-прежнему без scan (серверный `canScanQr`)

## Тесты

- BE: `vitest run src/lib/store/__tests__/orderCreate.pool-validation.test.ts`
- FE: `vitest run src/lib/order-totals.test.ts src/lib/mini-app/mini-app-scan-receive-policy.test.ts`

## Экспорт патчей

См. `artifacts/mini-app-pilot-20261122/patches/` — `fe.patch`, `be.patch`, `checksums.txt`.