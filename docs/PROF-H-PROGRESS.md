# PROF-H — progress (working identity + final acceptance)

## Git HEAD

| Repo | Branch | Base (given) | HEAD |
|------|--------|--------------|------|
| remcard-navigator | `feat/prof-h-profile-redesign` | `b0e3a332` | **`83a950cb`** |
| remcard-partner-platform | `feat/prof-h-profile-redesign` | `2860991` | _(see latest commit)_ |

## 1. Working identity — **DONE** (`83a950cb`)

- `GET /api/auth/me`: `PRO` → `effectiveWorkingDisplayName` / `effectiveWorkingCity`; `CLIENT`/staff — прежняя session-логика.
- Partnership search: `q` по `workingDisplayName` + fallback; карточки и city — те же helpers.
- Live catalog columns и public API без изменений при working-save.

Integration: `published solo: working name/city in auth/me and search q; public card unchanged`.

## 2. Tests (2026-10-09, this run)

### Unit / route (navigator)

```bash
cd remcard-navigator && pnpm run typecheck
cd remcard-navigator && DATABASE_URL=postgresql://postgres:***@127.0.0.1:5432/remcard_prof_test \
  pnpm exec vitest run \
  src/lib/__tests__/workingProfile.test.ts \
  src/lib/__tests__/partnershipSearchPagination.test.ts \
  src/app/api/partnership/search/__tests__/route.auth.test.ts \
  src/app/api/auth/me/__tests__/route.test.ts
```

| Exit | Passed | Failed | Skipped |
|------|--------|--------|---------|
| 0 | 26 | 0 | 0 |

### PG / API (`remcard_prof_test`)

Guard: `parsePgHost` loopback + `current_database() = remcard_prof_test`.  
Schema: `pnpm exec prisma db push` (isolated DB, not production migrate ledger).  
Legal: `pnpm seed:legal` + consents for browser fixtures.

```bash
JWT_SECRET=prof-h2-integration-test-secret-min-32-chars \
DATABASE_URL=postgresql://postgres:***@127.0.0.1:5432/remcard_prof_test \
pnpm exec vitest run src/lib/__tests__/profH2WorkingProfileRoutes.integration.test.ts
```

| Exit | Passed | Failed | Skipped |
|------|--------|--------|---------|
| 0 | **10** | 0 | 0 |

### Platform

```bash
cd remcard-partner-platform && npm run test:component
NODE_ENV=production npm run build
```

| Command | Exit | Passed |
|---------|------|--------|
| `test:component` | 0 | 73 |
| `production build` | 0 | — |

### Browser smoke (local backend)

Setup: single navigator `:3001` + platform `:3000` with `REMCARD_API_*` Basic; fixture JWT via `createToken` + HttpOnly cookie (Playwright); users `m1fix-prof-browser01/02`; `seed:legal` + consents.

```bash
cd remcard-partner-platform && npx playwright install chromium
node scripts/prof-h2-browser-smoke.mjs
# → {"loggedIn":true,"overflow":false}
```

| Viewport | Result |
|----------|--------|
| 1440×900 | «Основные данные», справочник товаров/услуг, этапы — **OK** |
| 390×844 | **overflow: false** |

Screenshots:

- `/opt/cursor/artifacts/screenshots/prof-h2-browser-1440-basics.png`
- `/opt/cursor/artifacts/screenshots/prof-h2-browser-save.png`
- `/opt/cursor/artifacts/screenshots/prof-h2-browser-reload.png`
- `/opt/cursor/artifacts/screenshots/prof-h2-browser-390.png`

Не покрыто в этом smoke: второй партнёр, opt-in/search UI, «Показать ещё» (нужен отдельный прогон с двумя JWT и PartnersHub).

## 3. Blockers (minor)

- Browser smoke script не включает сценарий B→A search и pagination (ручной/расширенный скрипт).
- Локально: несколько параллельных `next dev` на `:3001` ломали `JWT_SECRET` — нужен один процесс с явным env.

## H3

Not started. No PR / release / deploy / production DB.
