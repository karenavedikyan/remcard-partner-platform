# Карта переиспользования: экран кабинета → backend RemCard

Дата: 6 октября 2026 года (обновлено после M1-unblock).

**Источники:** задание M1, `docs/tasks/M1-unblock.md`, публичный static demo `https://pro.remcard.ru` (SHA-256 в `docs/STATUS.md`).

**Navigator:** read-only доступ через Cloud Agent Select Multiple; контрольная точка `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7`. Auth/session сверены по `src/lib/proAuth.ts`, `/api/auth/me`, `/api/auth/logout`.

**Подключение:** кабинет → BFF `/api/remcard/*` → `REMCARD_API_BASE_URL` (только явно настроенный тестовый origin; production-default удалён). Cookie `remcard-token` не шарится между origin; прокси пересылает только allowlisted cookie.

---

## Прототип: опубликованные материалы

| Материал | URL | SHA-256 (2026-10-06) | Использование M1 |
| --- | --- | --- | --- |
| Index / shell | https://pro.remcard.ru/ | `a0e5a3e…064ad5b` | Структура HTML: `#app`, `#overlays`, module entry |
| Основные стили | https://pro.remcard.ru/style.css | `736c343d…372ad81` | Токены в `src/app/globals.css` |
| Workflows CSS | https://pro.remcard.ru/workflows.css | `2494a765…0eb312d` | Референс сценариев (не подключён runtime) |
| Certificate CSS | https://pro.remcard.ru/certificate.css | `aa87dd68…fce5538` | Референс сертификата |
| Bundled app | https://pro.remcard.ru/app.js | `db7c157b…ccc671f` | Vite bundle; imports: `chunk-DXJUU3BS.js`, `chunk-TK7TMV34.js`, `chunk-KTYMGLZA.js`, … |

**Важно:** URL вида `cabinet.js`, `prof-program.js` отдают SPA fallback (тот же HTML, 855 B), а не исходные модули. Классы и сценарии (`prof-program`, `prof-profile`, `cabinet`, …) видны внутри `app.js`.

Demo-расчёты и mock-данные прототипа **не** переносятся как бизнес-логика.

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

| Экран кабинета | Сценарий | API / сервис | Авторизация | Зависимости | Проверка |
| --- | --- | --- | --- | --- | --- |
| Вход | OAuth / telegram login | `GET /api/auth/me`; `POST /api/auth/logout`; провайдеры `POST /api/auth/*` (код не проверен) | Cookie `remcard-token` | `src/lib/proAuth.ts`, `src/app/api/auth/**` | Тестовый аккаунт + callback для кабинета через BFF |
| Регистрация | Регистрация PROF | `src/app/api/auth/**` (код не проверен) | `remcard-token` | Prisma User, ProProfile (код не проверен) | E2E в тестовом контуре |
| Профиль | Onboarding PROF | `GET/PATCH /api/pro/profile` | PROF-роль | `proBranchContext.ts`, `api/pro/profile/route.ts` | Авторизованный запрос через BFF |
| Выход | Logout | `POST /api/auth/logout` | Активная сессия | — | POST через BFF; cookie cleared |
| Список партнёров | Partnership list | `GET /api/partnership/list` | PROF / staff | `PartnershipListBlock.tsx`, partnership API | Авторизованный GET |
| Поиск | Partner search | `GET /api/partnership/search` | PROF | partnership API | Авторизованный GET |
| Приглашение | Invite | `POST /api/partnership/invite` | PROF + company | `PartnerInviteModal.tsx` | POST в тесте (без prod-отправки) |
| Условия | Negotiation | `src/app/api/partnerships/**` (код не проверен) | PROF / partner | Partnership, Terms | После доступа к navigator |
| QR/сертификат — выдача и список | Issue + list | **`GET/POST /api/store/certificate`** (`route.ts`; код не проверен) | PROF store | `src/app/api/store/certificate/route.ts` | **Не** `/issue` и **не** `/list` как отдельные маршруты — предположение снято в M1-unblock |
| Публичная карточка | Certificate by code | `GET /api/certificate/[code]` | Публичный | `certificatePublicPayload.ts` | GET с тестовым кодом |
| PDF | Download | `GET /api/certificate/[code]/pdf` | Как карточка | pdf route | GET → `application/pdf` (binary proxy) |
| Сканирование | Scan flow | UI: `store/scan/page.tsx` | Store / PROF | order routes | Ручной ввод в тесте |
| Preview заказа | Order preview | `POST /api/store/order/preview` | Store user | preview route | POST в тесте |
| Покупка | Place order | `POST /api/store/order` | Store + CSRF (код не проверен) | order route | POST в тесте |
| История начислений | Bonus history | `GET /api/bonus/history`; `GET /api/store/bonus-list` | PROF / store | bonus API | Уточнить path по navigator |
| Баланс | Available bonuses | `GET /api/bonus/balance` | PROF | bonus API, cron (не из кабинета) | Авторизованный GET |

---

## BFF allowlist (реализовано)

Прокси разрешает только проверенные пары method+path (см. `src/lib/remcard-proxy.ts`). Широкие префиксы `/api/pro/`, `/api/store/` заменены точечным списком. Path traversal (`..`, encoded `/`) блокируется.

Mutating-запросы: `Origin` обязан совпадать с `NEXT_PUBLIC_APP_URL` (null/чужой origin → 403). Cookie upstream: только `remcard-token`. Navigator OAuth cookies: `oauth_vk_state`, `oauth_yandex_state`, `oauth_pending_consents` — **не проксируются** (блокер полного OAuth через BFF).

---

## Минимальные адаптации backend (не применены)

| Изменение | Причина |
| --- | --- |
| CORS для `pro.remcard.ru` **или** только BFF | Браузер не вызывает remcard.ru напрямую |
| OAuth callback URI для кабинета | Провайдеры, вероятно, настроены на remcard.ru |
| CSRF/origin allowlist для BFF-origin | POST order, invite и др. |
| Cookie names для OAuth flow | Возможны temp cookies помимо `remcard-token` |

**Выбранный способ M1:** BFF в partner-platform. Backend-изменения — после согласования.

---

## Прототип vs production

| Материал | Источник | M1 |
| --- | --- | --- |
| CSS-переменные, Manrope | `style.css` | `globals.css` |
| Workflows / certificate CSS | live URLs | Документированы; не подключены |
| HTML/JS bundle | `app.js` + chunks | Референс; demo-логика не переносится |
| Закрытый repo прототипа | Не передан | Не блокирует токены/CSS из live demo |
