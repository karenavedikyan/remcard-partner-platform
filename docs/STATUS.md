# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года.

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` (этот репозиторий) | `6c59c38` (до M1) → см. коммит M1 | Ветка `cursor/m1-foundation-aa2d` |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` (контрольная точка M1) | **Не клонирован** — repo not found / private |
| Прототип (live) | `pro.remcard.ru`, CSS etag ~2026-10-03 | Статический demo; токены извлечены |
| Production API | `remcard.ru` | Зондирование без auth |

## M1: выполнено

- [x] Минимальный каркас Next.js 14 + TypeScript, совместимый со стеком основного сайта (Next.js).
- [x] Дизайн-токены из утверждённого прототипа (`pro.remcard.ru/style.css`).
- [x] Технический стартовый экран (`/`) без фиктивных финансов.
- [x] API-клиент + BFF `/api/remcard/[...path]` с allowlist префиксов.
- [x] `.env.example`, `.gitignore`.
- [x] `docs/SCOPE.md`, `docs/REUSE-MAP.md`, `docs/STATUS.md`.
- [x] Локальная сборка и dev-сервер (см. команды ниже).

## M1: не выполнено / частично

- [ ] Полная карта переиспользования по исходникам `remcard-navigator` — **заблокировано** (нет доступа к repo).
- [ ] Подтверждённый вход/регистрация с сохранением `userId` в тестовом контуре — **заблокировано** (нет тестовых учётных данных и callback).
- [ ] Перенос UI-компонентов из исходников прототипа — **заблокировано** (исходники не переданы; использованы только публичные CSS-токены).

## Проверки

| Проверка | Результат |
| --- | --- |
| `npm install && npm run build` | ✅ (см. отчёт агента) |
| `npm run dev` + GET `/` | ✅ стартовый экран |
| BFF → `GET /api/auth/me` | ✅ `{ "user": null }` через proxy |
| CORS remcard.ru с localhost | ❌ нет ACAO — нужен BFF (реализован) или backend change |
| Cookie cross-subdomain | ❌ `remcard-token` host-only на remcard.ru |
| Diff на секреты | ✅ `.env` в gitignore; example без секретов |
| Production cron/notifications | ✅ не вызываются |

## Блокеры

1. **Доступ к `karenavedikyan/remcard-navigator`** — необходим для верификации auth flow, CSRF, Prisma-моделей и точных path.
2. **Исходники прототипа (репозиторий)** — для переноса компонентов beyond CSS tokens.
3. **Тестовые учётные данные + OAuth callback** — для подтверждения сессии без дублирования userId.

## Следующий шаг (M2)

Один небольшой шаг: после получения доступа к `remcard-navigator` — верифицировать auth flow (`proAuth.ts`, `/api/auth/**`) и реализовать экран входа с redirect через BFF, без изменения production backend до согласования CORS/callback.
