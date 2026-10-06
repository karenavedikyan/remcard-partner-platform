# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (продолжение M1).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m1-foundation-aa2d`, commit после `0a48563` | M1 продолжение: безопасный конфиг, прокси, транспортные тесты |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` (контрольная точка M1) | **Нет доступа** — `git clone` → `Repository not found` (private) |
| Прототип (live static) | см. таблицу SHA ниже | Vite SPA; именованные `*.js` URL отдают SPA fallback |
| Тестовый backend | — | **Не предоставлен** — `REMCARD_API_BASE_URL` пуст; production не используется |

### SHA-256 опубликованных материалов прототипа (2026-10-06)

| URL | SHA-256 | Размер | Примечание |
| --- | --- | --- | --- |
| https://pro.remcard.ru/ | `a0e5a3e87c3b621e66542611e76f7e6ed21a5e8d4406d69bfa1fee378064ad5b` | 855 B | index.html |
| https://pro.remcard.ru/style.css | `736c343d8a6f37b164915cbed647e8351ba45bb71f8fae0a75c1f142d372ad81` | 31 233 B | основные токены |
| https://pro.remcard.ru/workflows.css | `2494a765d7198226120c29c068c460e51dc3f0f3be2870be0b7ddb88d0eb312d` | 85 705 B | сценарии |
| https://pro.remcard.ru/certificate.css | `aa87dd68bffe793adb795a20a8d6809eacf14f355391df9e2896cc8cbfce5538` | 21 548 B | сертификат |
| https://pro.remcard.ru/app.js | `db7c157b47e9ecf9a8ca9926d4e05bcab5322d513e861d21abe019725ccc671f` | 1 632 733 B | bundled entry + chunks |

Именованные URL (`cabinet.js`, `prof-program.js`, …) на момент проверки возвращают тот же `index.html` (855 B, SPA fallback), а не отдельные модули. Реальная логика — в `app.js` и `./chunk-*.js`.

## M1: выполнено

- [x] Минимальный каркас Next.js 14 + TypeScript.
- [x] Дизайн-токены из `pro.remcard.ru/style.css`.
- [x] Технический стартовый экран без фиктивных финансов.
- [x] BFF `/api/remcard/[...path]` с allowlist path+method, нормализацией пути, origin-check для mutating.
- [x] Без production-default: без `REMCARD_API_BASE_URL` сетевых запросов нет; экран показывает «Тестовый backend не подключён».
- [x] Прокси: binary/PDF через `arrayBuffer`, `Location`, множественные `Set-Cookie`, cookie allowlist (`remcard-token`), timeout, `Cache-Control: no-store`.
- [x] SSR-сессия: `getAuthMeServer()` передаёт cookie текущего запроса.
- [x] Удалён неиспользуемый `REMCARD_BFF_SECRET`.
- [x] Транспортные тесты прокси (`npm run test:proxy`) на локальном stub — **не E2E вход**.
- [x] Изучены опубликованные материалы прототипа; SHA зафиксированы.
- [x] `docs/SCOPE.md`, `docs/REUSE-MAP.md`, `docs/STATUS.md`, `docs/tasks/M1-unblock.md`.

## M1: не выполнено / частично

- [ ] Карта переиспользования по исходникам `remcard-navigator` — **заблокировано** (нет read-only доступа).
- [ ] Подтверждённый вход/регистрация с сохранением `userId` — **заблокировано** (нет тестового backend и OAuth callback).
- [ ] Перенос React-компонентов из закрытого repo прототипа — **не требуется для M1**; публичный static demo достаточен для токенов/разметки.

## Проверки

| Проверка | Результат |
| --- | --- |
| `npm install && npm run build` | ✅ |
| `npm run test:proxy` | ✅ 9/9 транспортных тестов (PDF, redirect, cookie, timeout, path/method/origin) |
| `npm run dev` + GET `/` без `.env` | ✅ «Тестовый backend не подключён», без upstream-запросов |
| BFF без `REMCARD_API_BASE_URL` | ✅ HTTP 503 `{ error: "Test backend is not configured" }` |
| `git clone karenavedikyan/remcard-navigator` | ❌ Repository not found |
| test/staging/dev remcard hosts | ❌ DNS не резолвится |
| Diff на секреты | ✅ |
| Production cron/notifications | ✅ не вызываются |

## Блокеры

1. **Read-only доступ к `karenavedikyan/remcard-navigator`** — владелец должен разрешить GitHub-интеграции Cursor читать private repo (или открыть локальную копию рядом). Без этого нельзя подтвердить auth flow, CSRF, Prisma-модели и точные API paths.
2. **Тестовый backend + OAuth callback URL** — `REMCARD_API_BASE_URL` не задан; типичные test/staging хосты недоступны. Production (`remcard.ru`) **не используется** как замена.
3. **OAuth temp cookies** — allowlist прокси сейчас только `remcard-token`; после чтения auth-кода navigator могут понадобиться дополнительные имена.

## Следующий шаг (в рамках M1, не M2)

После снятия блокеров 1–2: верифицировать auth flow по `proAuth.ts` / `/api/auth/**`, проверить вход/выход и сохранение `userId` в тестовом контуре через BFF. M2 (экраны входа/профиля) не начинать до закрытия M1-блокеров.
