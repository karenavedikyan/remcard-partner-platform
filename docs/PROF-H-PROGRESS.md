# PROF-H — progress (working identity + final acceptance)

## Git HEAD

| Repo | Branch | Base (given) | HEAD |
|------|--------|--------------|------|
| remcard-navigator | `feat/prof-h-profile-redesign` | `83a950cb` | **`83a950cb`** (+ pagination seed script commit) |
| remcard-partner-platform | `feat/prof-h-profile-redesign` | `dec181e` | **(see latest push on branch)** |

## 1. Working identity — **DONE** (`83a950cb`)

- `GET /api/auth/me`: `PRO` → `effectiveWorkingDisplayName` / `effectiveWorkingCity`; `CLIENT`/staff — прежняя session-логика.
- Partnership search: `q` по `workingDisplayName` + fallback; карточки и city — те же helpers.
- Live catalog columns и public API без изменений при working-save.

Integration: `published solo: working name/city in auth/me and search q; public card unchanged`.

## 2. Tests (2026-10-09)

### Unit / route (navigator) — not re-run this turn (app unchanged)

Prior run: **26 passed**, exit 0 (`workingProfile`, pagination, search auth, auth/me).

### PG / API (`remcard_prof_test`) — not re-run this turn

Prior run: **10 passed**, exit 0 (`profH2WorkingProfileRoutes.integration.test.ts`).

### Platform component (this turn — unsaved leave guard)

```bash
cd remcard-partner-platform && npm run test:component -- --run src/components/profile/ProfileEditor.test.tsx
```

| Exit | Passed | Failed |
|------|--------|--------|
| 0 | 12 | 0 |

### Browser acceptance (PROF-H2, local stack)

Setup: один navigator `:3001` + platform `:3000`; `JWT_SECRET` согласован; `remcard_prof_test`; `seed:legal` + consents; fixture users `m1fix-prof-browser01` (A) / `m1fix-prof-browser02` (B); HttpOnly cookie via Playwright.

```bash
cd remcard-partner-platform
node scripts/prof-h2-seed-pagination.mjs   # remcard_prof_test only, marker RC-H2-BROWSER-PAG-
npx playwright install chromium             # once
node scripts/prof-h2-browser-smoke.mjs
```

| Exit code | Result |
|-----------|--------|
| **0** | **PASS** |

| # | Сценарий (1440 / 390) | Result |
|---|------------------------|--------|
| 1 | A: рабочее имя, город, справочник (двери / плитка / диагностика), opt-in, save → reload | **PASS** |
| 2 | B: поиск по имени, фильтры, карточка с именем и городом | **PASS** |
| 3 | A opt-out → B не находит; opt-in → снова находит | **PASS** |
| 4 | Pagination: 28 seeded профилей (null / shared `lastActiveAt`), «Показать ещё», без дублей, порядок = API | **PASS** |
| 5 | Несохранённые изменения: confirm при уходе, cancel сохраняет ввод, после save — без ложного confirm | **PASS** |
| — | 390×844 horizontal overflow | **PASS** (`overflow_390`) |

**Console errors:** none captured.

**Не проверялось:** реальный вход через Telegram / MAX (только JWT fixture + cookie).

### Screenshots

- `/opt/cursor/artifacts/screenshots/prof-h2-s1-a-basics-1440.png`
- `/opt/cursor/artifacts/screenshots/prof-h2-s1-a-after-save.png`
- `/opt/cursor/artifacts/screenshots/prof-h2-s1-a-after-reload.png`
- `/opt/cursor/artifacts/screenshots/prof-h2-s2-b-found-a.png`
- `/opt/cursor/artifacts/screenshots/prof-h2-s3-b-a-hidden.png`
- `/opt/cursor/artifacts/screenshots/prof-h2-s3-b-a-visible-again.png`
- `/opt/cursor/artifacts/screenshots/prof-h2-s4-pagination.png`
- `/opt/cursor/artifacts/screenshots/prof-h2-s5-cancel-leave.png`
- `/opt/cursor/artifacts/screenshots/prof-h2-browser-390.png`

### Code touched for H2 acceptance

- `ProfileEditor.tsx`: `confirm` при уходе из «Основных данных» с dirty draft; `beforeunload`; guard на link «Вернуться».
- `scripts/prof-h2-browser-smoke.mjs`: полный сценарий A/B, JSON-отчёт, скриншоты.
- `scripts/prof-h2-seed-pagination.mjs` + navigator `scripts/prof-h2-seed-pagination.ts`: seed для page 2 (loopback `remcard_prof_test` only).

## H3

Not started. No PR / release / deploy / production DB.

**H2 acceptance complete, готов к H3.**
