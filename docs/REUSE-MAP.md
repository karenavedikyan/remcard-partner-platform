# Карта переиспользования: экран кабинета → backend RemCard

Дата: 6 октября 2026 года.

**Источники:** задание M1 (пути в `remcard-navigator`), публичное зондирование `https://remcard.ru` (без авторизации), CSS прототипа `https://pro.remcard.ru/style.css`.

**Ограничение:** репозиторий `karenavedikyan/remcard-navigator` недоступен агенту (private / нет прав). Строки с пометкой «код не проверен» требуют верификации по SHA `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` или актуальному `main`.

**Подключение:** новый кабинет → локальный BFF `/api/remcard/*` → `REMCARD_API_BASE_URL` (по умолчанию `https://remcard.ru`). Cookie `remcard-token` не шарится между origin автоматически; повторный вход на новом origin допустим.

---

## Сводная таблица

```text
Экран нового кабинета
→ существующий пользовательский сценарий
→ API / сервис
→ авторизация и права
→ необходимые зависимости
→ способ проверки
```

| Экран кабинета | Сценарий на remcard.ru | API / сервис | Авторизация и права | Зависимости | Проверка |
| --- | --- | --- | --- | --- | --- |
| Вход | OAuth / telegram login (PROF) | `POST /api/auth/telegram` (405 без тела — маршрут есть); прочие провайдеры в `src/app/api/auth/**` (код не проверен) | Cookie `remcard-token`; `GET /api/auth/me` → `{ user: null \| {...} }` | `src/lib/proAuth.ts`, NextAuth или custom auth (код не проверен) | Тестовый аккаунт + callback URL для `pro.remcard.ru` / localhost через BFF |
| Регистрация | Регистрация PROF-партнёра | Маршруты в `src/app/api/auth/**` (код не проверен) | После регистрации — тот же `remcard-token` | Prisma: User, ProProfile (код не проверен) | E2E регистрация в тестовом контуре; userId не дублируется |
| Профиль / onboarding | Обязательные поля PROF | `GET/PATCH /api/pro/profile` → **401** без cookie | PROF-роль, контекст филиала (`src/lib/proBranchContext.ts`) | `src/app/api/pro/profile/route.ts` | Авторизованный запрос через BFF; сверка полей с UI прототипа |
| Выход | Завершение сессии | `POST /api/auth/logout` → очищает `remcard-token` | Любая активная сессия | — | POST через BFF; `GET /api/auth/me` → `user: null` |
| Список партнёров | Список партнёрств компании | `GET /api/partnership/list` → **401**; UI: `PartnershipListBlock.tsx` | PROF / company staff | `src/app/api/partnership/**`, `src/components/partnership/PartnershipListBlock.tsx` | Авторизованный GET; сверка с `/pro` |
| Поиск партнёра | Поиск по базе | `GET /api/partnership/search` → **401** | PROF | `src/app/api/partnership/**` | Авторизованный GET с query |
| Приглашение | Отправка приглашения | `POST /api/partnership/invite` → **405** (маршрут есть) | PROF + права компании | `PartnerInviteModal.tsx`, partnership API | POST в тестовом контуре (без реальной отправки в prod) |
| Условия сотрудничества | Просмотр и согласование | `src/app/api/partnerships/**` (код не проверен; `/api/partnerships/list` → 404) | PROF / partner | Prisma: Partnership, Terms (код не проверен) | Только после доступа к исходникам |
| Выдача QR/сертификата | Issue certificate | `POST /api/store/certificate/issue` → **401** | PROF store role | `src/app/api/store/certificate/**` | Авторизованный POST в тесте |
| Список сертификатов | Список выданных | `GET /api/store/certificate/list` → **401** | PROF | store certificate API | Авторизованный GET |
| Публичная карточка | Карточка по коду | `GET /api/certificate/[code]` (`src/lib/certificatePublicPayload.ts`) | Публичный / ограниченный | certificate routes | GET с валидным кодом (тестовый) |
| PDF сертификата | Скачивание PDF | `GET /api/certificate/[code]/pdf` | Как у карточки | `src/app/api/certificate/[code]/pdf/route.ts` | GET → application/pdf |
| Сканирование | Scan flow | UI: `src/app/store/scan/page.tsx` → preview/order API | Store / PROF | store order routes | Ручной ввод кода в тесте |
| Просмотр условий покупки | Order preview | `POST /api/store/order/preview` → **401** с `{}` | Авторизованный store user | `src/app/api/store/order/preview/route.ts` | POST с телом заказа (тест) |
| Покупка | Оформление заказа | `POST /api/store/order` → **405** без тела | Store + CSRF/origin (код не проверен) | order route | POST в тестовом контуре |
| История начислений | Bonus history | `GET /api/bonus/history` → **404** (возможно другой path); `GET /api/store/bonus-list` → **401** | PROF / store | `src/app/api/bonus/**`, `src/app/api/store/bonus-list/route.ts` | Уточнить path по исходникам |
| Баланс / начисления | Доступные бонусы | `GET /api/bonus/balance` → **401** | PROF | bonus API, cron `src/app/api/cron/confirm-bonuses/route.ts` (не вызывать из кабинета) | Авторизованный GET; cron только на backend |

---

## Минимальные адаптации backend (не применены)

| Изменение | Причина | Объём |
| --- | --- | --- |
| CORS + `Access-Control-Allow-Credentials` для `https://pro.remcard.ru` (и dev origin) **или** обязательный BFF на том же origin | Браузер с `localhost:3000` / `pro.remcard.ru` не получает CORS-заголовков от `remcard.ru` (проверено OPTIONS/POST) | Несколько строк в middleware / next config основного сайта **или** только BFF без CORS |
| OAuth callback / redirect URI для `pro.remcard.ru` | Telegram/Yandex/VK callback сейчас, вероятно, только для `remcard.ru` | Добавить URI в конфиг провайдеров |
| Cookie `Domain=.remcard.ru` (опционально) | Сейчас `remcard-token` без domain → host-only; поддомен не наследует сессию | Альтернатива: повторный вход на pro.remcard.ru (предпочтительно по M1) |
| CSRF / origin allowlist для mutating requests из BFF | POST order, invite и др. могут проверять origin | Добавить origin кабинета или проксировать только server-side |

**Выбранный способ M1:** BFF-прокси в partner-platform (реализован). Backend-изменения — только после согласования.

---

## Прототип vs production

| Материал | Источник | Использование в M1 |
| --- | --- | --- |
| CSS-переменные, Manrope, цвета | `https://pro.remcard.ru/style.css` (etag, 2026-10-03) | Скопированы в `src/app/globals.css` |
| HTML/JS прототип (`app.js`, demo data) | `https://pro.remcard.ru` | **Не** переносились; demo-логика не является backend |
| Исходники прототипа (репозиторий) | Не переданы | **Блокер** для полного переноса компонентов |
