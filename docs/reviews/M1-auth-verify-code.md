# M1.3: вход через verify-code (анализ navigator, read-only)

Дата: 6 октября 2026. Navigator SHA: `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7`.

## 1. Какой способ входа проще проверить первым?

**`POST /api/auth/verify-code`** — 6-значный код из Telegram/MAX бота (`BotLoginCode` в БД).

Почему не VK/Yandex OAuth на первом шаге:

- OAuth требует temp cookies (`oauth_vk_state`, `oauth_pending_consents`), allowlist внешних redirect на `id.vk.com` / Yandex ID и согласованный `VK_REDIRECT_URI` / `YANDEX_REDIRECT_URI` на origin кабинета.
- Callback navigator редиректит на `NEXT_PUBLIC_APP_URL` backend — без отдельной настройки или переписывания Location пользователь уходит с origin кабинета.
- verify-code — один POST через BFF, `remcard-token` в Set-Cookie на origin кабинета, без изменений navigator.

## 2. Может ли кабинет использовать существующий вход без изменения navigator?

**Да, для verify-code.** Маршрут уже реализован в navigator; partner-platform проксирует его через BFF.

VK/Yandex **тоже** реализованы в navigator, но для полного round-trip через кабинет нужны env на navigator (см. ниже) и расширение BFF (cookies + external Location) — отложено после verify-code.

## 3. Точные маршруты, cookies и переменные

### verify-code (выбран для M1.3)

| Элемент | Значение |
| --- | --- |
| BFF | `POST /api/remcard/api/auth/verify-code` |
| Upstream | `POST /api/auth/verify-code` |
| Request body | `{ "code": "123456" }` |
| Session cookie | `remcard-token` (httpOnly, sameSite=lax, path=/) |
| Temp OAuth cookies | **не нужны** |
| Logout | `POST /api/remcard/api/auth/logout` (уже в allowlist) |
| Me | `GET /api/remcard/api/auth/me` |

**Navigator (backend):** `JWT_SECRET`, `DATABASE_URL` с таблицами `User`, `BotLoginCode`; рабочий Telegram/MAX bot, создающий код через `/login`.

**Partner-platform:** `REMCARD_API_BASE_URL`, опционально `REMCARD_API_BASIC_*`, `NEXT_PUBLIC_APP_URL`.

### VK OAuth (следующий шаг, не в M1.3)

| Элемент | Значение |
| --- | --- |
| Start | `GET /api/auth/vk/start?c=<base64url consents>&returnTo=/` |
| Callback | `GET /api/auth/vk/callback?code=…&state=…` |
| Temp cookies | `oauth_vk_state`, `oauth_pending_consents` (5 min) |
| Provider redirect | `https://id.vk.com/authorize` |
| Navigator env | `VK_CLIENT_ID`, `VK_CLIENT_SECRET`, `VK_REDIRECT_URI` |

`VK_REDIRECT_URI` должен указывать на **BFF callback** кабинета, например `http://127.0.0.1:3000/api/remcard/api/auth/vk/callback`, и быть зарегистрирован в VK ID.

## 4. Настройки в тестовой среде (только наличие)

Проверено в `/tmp/cursor/m1-local/`:

| Переменная | navigator | partner |
| --- | --- | --- |
| `JWT_SECRET` | задан | — |
| `DATABASE_URL` | задан | — |
| `STAGING_AUTH_USER` | задан | — |
| `REMCARD_API_BASE_URL` | — | задан |
| `NEXT_PUBLIC_APP_URL` | — | задан |
| `VK_CLIENT_ID` | **не задан** | — |
| `VK_CLIENT_SECRET` | **не задан** | — |
| `VK_REDIRECT_URI` | **не задан** | — |
| `YANDEX_*` | **не задан** | — |
| `TELEGRAM_BOT_TOKEN` | **не задан** | — |

Без bot token и записи в `BotLoginCode` **настоящий verify-code вход не проверялся** — только mock-тесты BFF и ранее fixture JWT.

## Разделение типов проверок

| Тип | Что доказывает |
| --- | --- |
| Mock BFF tests (`npm run test:proxy`) | allowlist, origin, cookie filter для verify-code |
| Fixture JWT | transport сессии, не login flow |
| Real verify-code | нужен bot + код в тестовой БД |
