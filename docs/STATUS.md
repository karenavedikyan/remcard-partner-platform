# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M1: локальный backend + proxy hardening).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m1-foundation-aa2d` | M1: proxy fixes, upstream Basic Auth, local-dev docs |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only; доступ через Select Multiple |
| Прототип (live static) | SHA-256 в таблице ниже | Vite SPA |
| Тестовый backend | локальный `127.0.0.1:3001` | Только в dev VM; не production |

### SHA-256 опубликованных материалов прототипа (2026-10-06)

| URL | SHA-256 | Размер |
| --- | --- | --- |
| https://pro.remcard.ru/ | `a0e5a3e87c3b621e66542611e76f7e6ed21a5e8d4406d69bfa1fee378064ad5b` | 855 B |
| https://pro.remcard.ru/style.css | `736c343d8a6f37b164915cbed647e8351ba45bb71f8fae0a75c1f142d372ad81` | 31 233 B |
| https://pro.remcard.ru/workflows.css | `2494a765d7198226120c29c068c460e51dc3f0f3be2870be0b7ddb88d0eb312d` | 85 705 B |
| https://pro.remcard.ru/certificate.css | `aa87dd68bffe793adb795a20a8d6809eacf14f355391df9e2896cc8cbfce5538` | 21 548 B |
| https://pro.remcard.ru/app.js | `db7c157b47e9ecf9a8ca9926d4e05bcab5322d513e861d21abe019725ccc671f` | 1 632 733 B |

## M1: выполнено

- [x] Каркас Next.js 14, BFF, design tokens, transport tests.
- [x] Upstream Basic Auth (`REMCARD_API_BASIC_USER` / `REMCARD_API_BASIC_PASSWORD`), запрет credentials в URL.
- [x] Origin-check для mutating; убран широкий auth allowlist; безопасная фильтрация `Location`.
- [x] No-body responses 204/205/304/HEAD; cookie allowlist `remcard-token`.
- [x] Локальный test backend smoke (navigator `:3001` + cabinet `:3000` в Cloud Agent VM).
- [x] Fixture seed SQL, local-dev docs, schema bootstrap diagnosis.
- [x] Fixture-сессия через BFF (JWT), logout — **не OAuth login**.

## M1: не выполнено / частично

- [ ] Настоящий OAuth/login с сохранением `userId` через провайдера.
- [ ] Production-ready schema bootstrap navigator на пустой PostgreSQL.
- [ ] OAuth temp cookies в BFF (`oauth_vk_state`, `oauth_yandex_state`, `oauth_pending_consents`).
- [ ] M2 экраны PROF — **не начинать** до закрытия M1.

## Проверки

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | см. CI / последний commit |
| `npm run build` | см. CI / последний commit |
| Локальный BFF fixture session | ✅ в Cloud Agent VM |
| Production / remcard.ru | ❌ не вызывался |

## Блокеры

1. **OAuth через BFF** — нужны test callback + проксирование OAuth state cookies или отдельный login path.
2. **Navigator schema baseline** — `migrate deploy` / `db push` на пустой БД; см. `docs/reviews/M1-schema-bootstrap-diagnosis.md`.
