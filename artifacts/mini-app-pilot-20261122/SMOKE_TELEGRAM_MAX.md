# Изолированный smoke mini-app (Telegram / MAX), без production

## Предусловия

- Локально: `npm run dev` в **remcard-partner-platform** и API **remcard-navigator** (или fixture proxy).
- Ветка: `cursor/remcard-mini-app-telegram-max-parity-d461`.
- **Не** подключать production БД, Timeweb, ботов с боевыми токенами; **не** слать реальные сообщения пользователям.

## Fixture mini-app (без мессенджера)

```bash
cd remcard-partner-platform
npm run dev
# Открыть /dev/mini-app-fixture?scenario=scan-receive
```

Сценарии в `src/app/dev/mini-app-fixture/fixtures-data.ts`: скан → CRM → preview → скидка → подтверждение.

Проверить вручную:

1. «Максимум по категории» совпадает с `maxClientDiscountPercent` из preview.
2. После искусственного 400 по лимиту — правка скидки и **второй** POST (validation-retry).
3. При offered > max (live 8, сертификат 10%) — блок до исправления.

## Telegram / MAX WebView (mock auth)

Использовать dev bootstrap endpoint с **тестовым** `actorUserId` и локальным JWT, как в существующих integration-фикстурах mini-app (без invite/payout flows).

```bash
# Пример: только проверка маршрута bootstrap (curl к localhost)
curl -sS -X POST http://127.0.0.1:3000/api/pro/mini-app/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"platform":"telegram-dev-fixture"}' | jq .
```

Далее открыть URL mini-app из ответа в WebView эмуляторе (Browser devtools mobile) — **не** публиковать в боевой бот.

## Негативные проверки

- Сеть offline после confirm → uncertain, без дубля заказа (см. `MiniAppScanReceive.validation-retry.test.tsx`).
- POST с `discountPercent` выше live max → 400, без записи order/bonus (BE route mock / vitest).

## Автоматика перед smoke

```bash
# FE
npm exec vitest run src/lib/order-totals.test.ts \
  src/components/mini-app/MiniAppScanReceive.validation-retry.test.tsx \
  src/components/mini-app/MiniAppScanReceive.discount.test.tsx

# BE
cd ../remcard-navigator
npm exec vitest run src/lib/store/__tests__/orderCreate.pool-validation.test.ts \
  src/lib/store/__tests__/storeOrderCategoryLimit.test.ts
```