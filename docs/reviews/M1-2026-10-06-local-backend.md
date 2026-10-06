# M1: локальный backend и сохранение правок кабинета

Дата: 6 октября 2026. Navigator SHA (read-only): `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7`. Partner branch: `cursor/m1-foundation-aa2d`.

Доступ к обоим репозиториям решён через **Select Multiple** в Cloud Agent environment. M1 остаётся **частичным**; M2 не начинался.

## Выполнено в partner-platform

### BFF / proxy

- Upstream Basic Auth через server-only `REMCARD_API_BASIC_USER` + `REMCARD_API_BASIC_PASSWORD`; credentials в URL запрещены.
- Неполная пара Basic Auth → HTTP 503 с понятной ошибкой; без Basic Auth поведение прежнее.
- Mutating-запросы требуют `Origin === NEXT_PUBLIC_APP_URL`; `null` и чужой origin отклоняются.
- Удалён широкий allowlist `/api/auth/[…]`; `GET /api/auth/logout` больше не проходит.
- `204/205/304/HEAD` отдаются с `null` body в `buildProxyNextResponse`.
- `Location` пропускается только для relative path или absolute URL с origin тестового backend; внешние redirect (OAuth providers) отбрасываются.
- Cookie upstream: только `remcard-token` (session). OAuth temp cookies navigator (`oauth_vk_state`, `oauth_yandex_state`, `oauth_pending_consents`) **не** проксируются — блокер полного OAuth через BFF.
- PDF/binary, query string, множественные `Set-Cookie` — регрессионные тесты.

### Локальная воспроизводимость

- `docs/local-dev/README.md`, шаблоны env, `scripts/local/seed-m1-fixtures.sql.example` с guard host/DB.
- `docs/reviews/M1-schema-bootstrap-diagnosis.md` — почему штатные migrate/db push не проходят на пустой БД.

## Проверки (Cloud Agent VM, 127.0.0.1)

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | регрессионные transport tests |
| `npm run build` | production build без upstream |
| Navigator `:3001` staging Basic Auth | 401 без auth, fixture JWT → `userId` PROF |
| BFF `/api/remcard/api/auth/me` | тот же `userId` через cookie |
| BFF POST logout | 200, cookie cleared |
| Production hosts | не вызывались |

**Fixture JWT** — проверка серверной сессии, **не** OAuth login.

## Блокеры M1 (остаются)

1. **Настоящий OAuth/login** — нужны тестовые callback URL и секреты провайдера; BFF не проксирует OAuth state cookies.
2. **Schema baseline navigator** — чистая установка требует squash/исправления FK (см. diagnosis doc); локальный patched bootstrap не является production baseline.
3. **REUSE-MAP** — часть строк всё ещё «код не проверен» до финальной сверки с navigator после merge PR.

## Следующий шаг (M1, не M2)

После merge PR (не автоматически): согласовать тестовый OAuth callback для origin кабинета или server-side login path; baseline migration в navigator — отдельная задача в private repo.
