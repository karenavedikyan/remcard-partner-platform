# PROF-H — progress (working identity + final acceptance)

## Git HEAD

| Repo | Branch | Base | HEAD |
|------|--------|------|------|
| remcard-navigator | `feat/prof-h-profile-redesign` | `b0e3a332` | **`83a950cb`** |
| remcard-partner-platform | `feat/prof-h-profile-redesign` | `2860991` | **`97c418f`** |

## 1. Working identity (effective displayName / city)

- **GET `/api/auth/me`:** для `role=PRO` — `effectiveWorkingDisplayName` / `effectiveWorkingCity`; CLIENT и staff без изменения legacy-логики session/displayName.
- **Partnership search:** фильтр `q` по `workingDisplayName` с fallback на `displayName`; карточки и city — effective helpers.
- **Публичный каталог:** live `displayName` / `city` не меняются при сохранении working (колонки `workingDisplayName`, `workingCity`).

## 2. Tests (2026-10-09 run)

### Unit / route (navigator, no PG)

| Command | Exit | Passed | Failed | Skipped |
|---------|------|--------|--------|---------|
| `pnpm run typecheck` | 0 | — | — | — |
| `vitest run workingProfile.test.ts partnershipSearchPagination.test.ts route.auth.test.ts auth/me/route.test.ts` | 0 | 25 | 0 | 0 |

### PG / API (`remcard_prof_test` @ 127.0.0.1)

**Подготовка:** `apt install postgresql`; `CREATE DATABASE remcard_prof_test`; `pnpm exec prisma db push` (не production migrate deploy); `JWT_SECRET` в env.

| Command | Exit | Passed | Failed | Skipped |
|---------|------|--------|--------|---------|
| `DATABASE_URL=postgresql://postgres:***@127.0.0.1:5432/remcard_prof_test vitest run profH2WorkingProfileRoutes.integration.test.ts` | 0 | **10** | 0 | 0 |

Покрыто: legacy directions; city+opt-in; STORE/COMPANY org opt-in; search opt-in/out; pagination null `lastActiveAt`; bad cursor 400; published solo working name in auth/me + search `q` + public card unchanged; catalog GET 200 без contact keys.

### Platform

| Command | Exit | Passed |
|---------|------|--------|
| `npm run test:component` | 0 | 73 |
| `NODE_ENV=production npm run build` | 0 | — |

### Browser smoke (1440 / 390)

**NOT VERIFIED** — автоматический browser-agent не прошёл gate логина (cookie `remcard-token` в UI).  
**Частично проверено вручную через curl:** BFF `GET http://127.0.0.1:3000/api/remcard/api/auth/me` с fixture JWT → 200 и user payload.  
Скриншоты: `/opt/cursor/artifacts/screenshots/prof-h2-auth-failure-report.md` (отчёт о блокере cookie в UI), целевые `prof-h2-browser-*.png` **не созданы**.

## 3. Blockers (remaining)

- Browser E2E с реальным cookie в Chromium (нужна ручная установка cookie или штатный login flow с ботом).
- Полный `prisma migrate deploy` chain на пустой БД не использовался; для CI/test — `db push` на isolated `remcard_prof_test`.

## H3

Not started. No PR / release / deploy / production DB.
