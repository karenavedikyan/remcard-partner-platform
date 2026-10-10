# PROF-H — progress (working identity + final acceptance)

## Git HEAD

| Repo | Branch | Base (given) | HEAD |
|------|--------|--------------|------|
| remcard-navigator | `feat/prof-h-profile-redesign` | `11e83db4` | see git log |
| remcard-partner-platform | `feat/prof-h-profile-redesign` | `33d4c4e` | see git log |

## PROF-H5 — organization team (2026-10-10)

- Reuse map: `docs/PROF-H5-REUSE-MAP.md` (both repos).
- Backend: `OrganizationMember`, `InviteScope.ORGANIZATION`, multi-branch invites/accept, `team` in employees-overview, owner `team-members` PATCH/DELETE, multi-branch `getProContext` + `remcard-pro-branch` cookie.
- Platform: team UI, org invite form, member editor, branch switcher, BFF allowlist.
- PG: `profH5Team.integration.test.ts` (**12 tests**) + `profH5StoreOrder.integration.test.ts` (**2 tests**) on `remcard_prof_test` — matrix A–J including store preview/order.
- Store regression fix: context-aware purchase gate (owner/SOLO vs branch staff), `canActivateCertificates` enforcement, order history via cabinet readiness for CLIENT employees.
- Browser: `prof-h5-browser-acceptance.mjs` **PASS** (1440/390) — see `docs/PROF-H5-ACCEPTANCE.md`.

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

### H3 fix-pass — Prisma mapper + form state + E2E (this turn)

| Scenario | Layer | Result |
|----------|-------|--------|
| Solo DRAFT full form payload → save → GET → submit → approve | API `profH3EndToEnd` | PASS |
| Published solo working vs public name/city | API `profH3CatalogFixPass` | PASS |
| Legacy `apartment-new` + catalog-only PATCH (partner search visible) | API `profH3EndToEnd` | PASS |
| Org DRAFT contacts save/reload/clear (no owner bleed) | API `profH3EndToEnd` | PASS |
| Org APPROVED contact draft → submit → approve | API `profH3EndToEnd` | PASS |
| COMPANY services-only via `POST …/submit-for-moderation` | API `profH3EndToEnd` | PASS |
| Catalog publication regression suite ×2 | API integration | **14/14 PASS** |
| Browser: layout, save/reload, directions both groups, upload reject, 390 overflow | `prof-h3-browser-smoke.mjs` exit **0** | PASS |

Commands:

```bash
cd remcard-navigator && pnpm run typecheck && \
  pnpm exec vitest run src/lib/__tests__/profH3EndToEnd.integration.test.ts \
    src/lib/__tests__/catalogPublicationRoutes.integration.test.ts \
    src/lib/__tests__/profH3CatalogFixPass.integration.test.ts
# run twice — both green

cd remcard-partner-platform && npm run test:component && NODE_ENV=production npm run build
node scripts/prof-h3-browser-smoke.mjs   # dev :3000 + nav :3001
```

Screenshots: `/opt/cursor/artifacts/screenshots/prof-h3-catalog-1440.png`, `prof-h3-catalog-390.png`.

### NOT VERIFIED (fix-pass)

- Moderation-notes UI flow in browser (API covered elsewhere).
- Successful logo upload to production blob (browser retry gets **503** when storage unset — client reject path verified).
- Org-only owner with separate STORE fixture in browser (API org contact bleed covered).

---

## PROF-H3 — residual defects + acceptance (2026-10-09)

Base SHAs at start: navigator **`942230a2`**, platform **`1b7c9cb`**.

### 1. Organization catalog fields in `profileDraftFromProfile` — **CLOSED**

- `catalogEntity === "organization"`: `specializations` / `storeCategories` (and related catalog slice) from **organization** effective arrays; empty org `[]` does **not** fall back to owner `User`.
- Platform: `profile-draft-sync.ts` + `profile-draft-sync.test.ts`, `ProfileEditor.test.tsx` («organization specializations, not owner user list»).
- Browser: `catalog_org_specializations_not_owner` on `m1fix-prof-browser-store01` (owner `doors`/`plumbing` vs org `tiles`/`doors`).

### 2. Working identity when overrides null — **CLOSED**

- Navigator: `workingIdentityPreserveBeforeCatalogPublicChange` before live catalog column writes (draft save + approve); does not overwrite existing overrides.
- Integration: solo DRAFT + published approve paths in `profH3EndToEnd` / `profH3CatalogFixPass`; explicit `auth/me` + `discardCatalogDraft` assertions on working name/city.
- Unit: `workingIdentityPreserve.test.ts`.

### Tests / build (this pass)

```bash
# navigator
cd remcard-navigator && pnpm run typecheck   # exit 0
NODE_ENV=production PLATFORM_INN=000000000000 PLATFORM_OGRN=000000000000000 pnpm run build   # exit 0
pnpm exec vitest run src/lib/__tests__/workingIdentityPreserve.test.ts \
  src/lib/__tests__/profH3EndToEnd.integration.test.ts \
  src/lib/__tests__/profH3CatalogFixPass.integration.test.ts \
  src/lib/__tests__/catalogPublicationRoutes.integration.test.ts
# ×2 runs: 20/20 then 17/17 integration (3 suites) — all pass

# platform
cd remcard-partner-platform && npm run test:component -- --run \
  src/lib/profile-draft-sync.test.ts src/components/profile/ProfileEditor.test.tsx   # exit 0, 17 passed
NODE_ENV=production npm run build   # exit 0
```

| Suite | Exit | Passed |
|-------|------|--------|
| Navigator typecheck | 0 | — |
| Navigator production build | 0 | — |
| Navigator H3 integration ×2 | 0 | **17/17** each |
| Navigator unit (`workingIdentityPreserve`) | 0 | **3/3** (in 20-test run) |
| Platform component (profile) | 0 | **17/17** |
| Platform production build | 0 | — |

### Browser (1440 / 390, local `:3000` / `:3001`)

```bash
cd remcard-partner-platform
node scripts/prof-h3-browser-fixtures.mjs   # remcard_prof_test loopback only
node scripts/prof-h3-browser-smoke.mjs
```

| Exit | Result |
|------|--------|
| **0** | **PASS** |

| Scenario | Result |
|----------|--------|
| Catalog layout + preview 1440 | PASS |
| Save → reload description | PASS |
| Org specializations (not owner bleed) | PASS |
| Directions picker (products + services) | PASS |
| Upload reject → retry same input | PASS |
| Mock upload → save → reload → preview | PASS *(UI contract; not production storage)* |
| Moderation note visible + catalog section | PASS |
| 390×844 overflow | PASS |

Screenshots:

- `/opt/cursor/artifacts/screenshots/prof-h3-catalog-1440.png`
- `/opt/cursor/artifacts/screenshots/prof-h3-catalog-390.png`
- `/opt/cursor/artifacts/screenshots/prof-h3-catalog-org-specializations.png`
- `/opt/cursor/artifacts/screenshots/prof-h3-moderation-notes.png`
- `/opt/cursor/artifacts/screenshots/prof-h3-upload-mock-preview.png`

Console: `net::ERR_NAME_NOT_RESOLVED` for `example.test` mock image URL only (expected).

### NOT VERIFIED (external)

- **Production blob storage** for real logo upload (503 when unset; mock documents UI contract only).
- **Real Telegram / MAX** login (fixture JWT + HttpOnly cookie only).

No PR / release / deploy / production DB.

---

## PROF-H4 — филиалы + сценарные разрывы (2026-10-09)

Reuse map: `docs/PROF-H4-REUSE-MAP.md`.

Base (задано): navigator **`cba0a4b2`**, platform **`8c8f25e`**.  
HEAD после H4-fix: navigator **`7d2879fa`**, platform **`db46c7c`**.

### Четыре разрыва (исправлено в коде)

1. **Полный snapshot опубликованного филиала** — name/city/address/geodata/`workingHours`/контакты + описание/фото/направления в `catalogDraft`; live до approve; `public-contacts` PATCH → draft или **409** при PENDING; approve транзакция + `syncBranchCatalogPublicContactsFromDraft`; editor GET — effective draft (`branchEditorEffective.ts`).
2. **Geohash без ручного SQL** — client-side Yandex (как `AddressGeocoder` в navigator): поиск → preview → «Подтвердить этот адрес»; stub `POST /api/pro/geocode/resolve` удалён; сброс geohash при смене **города или адреса**; `PATCH` с явным `addressGeohash: null`.
3. **Расписание** — пустое «Не указано»; grid только при 7/7 без потерь; legacy с перерывом; `09:99`/`24:00`/обратный интервал → 400 (server + client).
4. **Dirty / submit** — snapshot с contacts/photo/geo; один `persistBranchDraft`; submit save-first; confirm unpublish; замечания модератора (filter по id/имени филиала).

### Tests / build (this turn)

```bash
cd remcard-navigator && pnpm exec vitest run src/lib/__tests__/branchWorkingHours.test.ts src/lib/__tests__/profH4Branches.integration.test.ts
cd remcard-navigator && npm run build
cd remcard-partner-platform && npm run test:component -- --run src/lib/branch-working-hours.test.ts src/lib/branch-catalog-preview.test.ts
cd remcard-partner-platform && npm run build
```

| Check | Exit | Passed |
|-------|------|--------|
| `branchWorkingHours.test.ts` | 0 | **7/7** |
| `profH4Branches.integration.test.ts` (loopback `remcard_prof_test`) | 0 | **7/7** |
| Navigator `npm run build` | 0 | — |
| Platform branch unit tests | 0 | **5/5** |
| Platform `npm run build` | 0 | — |

### PROF-H4 — geocode + browser acceptance (2026-10-09, turn 2)

Base: navigator **`7d2879fa`**, platform **`6d230ab`**.  
HEAD: navigator **`d7a4389d`**, platform **`f276f0c`** (+ non-blocking geocode turn below).

| Check | Result |
|-------|--------|
| `profH4Branches.integration.test.ts` | **12/12** |
| `npm run test:proxy` (platform) | **228/228** |
| `profile-branch-save.test.ts`, `yandex-address-geocoder.test.ts` | **2/2** |
| Navigator / platform `npm run build` | exit **0** |
| `node scripts/prof-h4-browser-acceptance.mjs` | **PASS** (mock `ymaps`; 1440 + 390) |

Browser (mock provider): create → geocode confirm → save/reload → submit → staff approve → `GET /api/catalog/branch/[id]` + catalog search → published draft vs live → provider error retry → revise note → resubmit → contacts dirty / no overflow.

Artifacts: `prof-h4-e2e-after-approve-1440.png`, `prof-h4-e2e-390.png`, `prof-h4-a-create-no-geohash-1440.png`, `prof-h4-b-provider-down-390.png`, `prof-h4-browser-acceptance.json`.

### PROF-H4 — геокод не блокирует кабинет (2026-10-09, turn 3)

Правило: geohash обязателен **только** для submit на модерацию; создание филиала и «Сохранить черновик» без карты.

| Сценарий | API (remcard_prof_test) | Browser (mock ymaps) |
|----------|-------------------------|----------------------|
| **A** создать без geohash | `POST` branch без geohash → 201 | форма «Добавить филиал» → список → reload |
| **B** ошибка карт, save draft | — | provider down → save контакты → submit API 400 |
| **C** submit без geohash | submit → 400 | UI hint + alert + «Подтвердить адрес» |
| **D** retry → confirm → submit | — | preview → confirm → submit OK |
| **E** published + draft без geo | live unchanged, submit 400 | UI + API blocked |
| **F** контакты без сброса geo | PATCH channels, live geohash сохранён | geohash UI после save |

Сервер: submit использует effective snapshot — явный `addressGeohash: null` в draft не подменяется live geohash (`??` исправлено).

### PROF-H4 — retry геокодера (2026-10-09, turn 4)

Base: platform **`cd0c60c`**, navigator **`ceebccc1`**.

| Fix | Detail |
|-----|--------|
| Async geocode reject | `runYmapsGeocode` + `onRejected` на thenable; loading завершается в `finally` |
| Retry UI | `scriptErr` сбрасывается после успеха; preview/confirm на **той же странице** |
| `loadYmaps` | rejected in-flight не кэшируется; повтор реально перезапускает загрузку |
| Stale query | `searchGen` bump при смене адреса; поздний ответ не ставит preview |

| Check | Exit |
|-------|------|
| `yandex-address-geocoder.test.ts` + `BranchAddressGeocoder.test.tsx` | **5/5** |
| `npm run build` (platform) | **0** |
| `acceptance_D_retry_confirm_submit` (1440 + 390, async reject → retry → preview → save → reload) | **PASS** |

Artifacts: `prof-h4-d-retry-preview-1440.png`, `prof-h4-d-retry-preview-390.png`.

### PROF-H4 — query change during search (2026-10-09, turn 5)

При смене города/адреса во время запроса: `setSearching(false)` вместе с `searchGen++`; старый `finally` не трогает loading нового запроса.

| Check | Exit |
|-------|------|
| `BranchAddressGeocoder.test.tsx` (stale + race A/B) | **2/2** |
| `node scripts/prof-h4-geocode-query-race.mjs` | **0** |

Artifact: `prof-h4-geocode-query-race-1440.png`.

### NOT VERIFIED (external)

- **Реальный Yandex Maps API** в браузере (без mock `window.ymaps` / без live `api-maps.yandex.ru`).
- Production blob; real Telegram / MAX.

**H5 не начата.**
