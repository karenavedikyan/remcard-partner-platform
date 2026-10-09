# PROF-H — progress (working identity + final acceptance)

## Git HEAD

| Repo | Branch | Base (given) | HEAD |
|------|--------|--------------|------|
| remcard-navigator | `feat/prof-h-profile-redesign` | `e4df195d` | *(see commit below)* |
| remcard-partner-platform | `feat/prof-h-profile-redesign` | `7d2c93d` | *(see commit below)* |

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

## H3 — catalog publication UI (2026-10-09)

Reuse map: `docs/PROF-H3-REUSE-MAP.md`.

### Platform tests / build

```bash
cd remcard-partner-platform && npm run test:component
NODE_ENV=production npm run build
```

| Command | Exit | Passed |
|---------|------|--------|
| `test:component` | 0 | **75** |
| `production build` | 0 | — |

New/updated: `profile-catalog-completeness.test.ts`, `catalog-public-preview.test.ts`, `ProfileEditor.test.tsx`.

### Navigator

```bash
cd remcard-navigator && pnpm run typecheck
JWT_SECRET=... DATABASE_URL=.../remcard_prof_test \
  pnpm exec vitest run src/lib/__tests__/catalogPublicationRoutes.integration.test.ts
```

| Command | Exit | Notes |
|---------|------|--------|
| `typecheck` | 0 | PASS |
| `catalogPublicationRoutes.integration` | 0 | **8 passed** ×2 runs (see H3 fix-pass) |

### Browser (catalog)

```bash
cd remcard-partner-platform && node scripts/prof-h3-browser-smoke.mjs
```

| Exit | Scenarios |
|------|-----------|
| 0 | layout+preview 1440, save→reload, overflow 390 — **PASS** |

Screenshots:

- `/opt/cursor/artifacts/screenshots/prof-h3-catalog-1440.png`
- `/opt/cursor/artifacts/screenshots/prof-h3-catalog-390.png`

### Delivered (H3 scope)

- «Каталог RemCard»: headline, card (name/logo/description), taxonomy products/services, public contacts, preview, status/actions (save/submit/discard/unpublish/open remcard.ru).
- Logo upload via existing `/api/upload` (BFF proxy added); fallback `CategoryIcons` / `CatalogCategoryAvatar`.
- Explicit «Перенести направления из рабочего профиля»; catalog vs working contacts labeled.
- Unsaved catalog leave confirm + `beforeunload` (with basics guard).
- `persistCatalogDraftOnly`: `photoUrl` / `logoUrl`, `showFullName`, org name.

### NOT VERIFIED (this run)

- Full browser matrix (upload error, moderation notes UI, org-only write path in UI, all product/service/both layouts).
- Real remcard.ru public card pixel parity (preview is local DTO).
- Telegram/MAX login.
- Clean-room re-run of all 8 catalogPublication integration scenarios after DB reset.
- H4 branches / H5 staff.

No PR / release / deploy / production DB. **H4 not started.**

---

## PROF-H3 fix-pass (save defects) — **DONE**

### Root cause of prior 2 integration failures (not «DB pollution»)

| Test | Expected | Actual | Cause |
|------|----------|--------|--------|
| `user: PENDING resubmit stays in GET /api/catalog; live until approve` | PATCH draft **200** | **400** | Published solo with `isPublic` + incomplete **partner search minimum** (fixture `specializations: ['apartment-new']` ≠ trade id → empty effective services). Post-patch gate ran on **catalog-only** `{ catalogDraft }` updates. |
| `user: NEEDS_REVISION keeps staging…` | `catalogStatus` **PENDING** after submit | **APPROVED** | Same blocked draft PATCH → empty `catalogDraft` → submit returned 200 but `partnerProfileSubmitBlockedReason` path skipped status change / no staged draft. |

Fixes: `userPatchIsCatalogDraftOnly` skips partner-search gate for catalog-draft-only PATCH; fixtures use trade id `tiles`; `catalogDisplayName` draft pipeline; org contacts + directions/completeness alignment.

### Commands (this fix-pass)

```bash
# navigator — twice, both green
cd remcard-navigator && pnpm run typecheck
JWT_SECRET=... DATABASE_URL=postgresql://...@127.0.0.1:5432/remcard_prof_test \
  pnpm exec vitest run src/lib/__tests__/catalogPublicationRoutes.integration.test.ts \
                   src/lib/__tests__/profH3CatalogFixPass.integration.test.ts

# platform
cd remcard-partner-platform && npm run test:component && NODE_ENV=production npm run build
```

New regression: `profH3CatalogFixPass.integration.test.ts` (public name vs `workingDisplayName` through approve).

### NOT VERIFIED (fix-pass)

- Full 1440/390 browser matrix (upload error/retry, moderation notes, all three direction layouts) — extend `prof-h3-browser-smoke.mjs` when stack is up.
- Production blob delivery (upload tests may mock / skip when storage unset).
