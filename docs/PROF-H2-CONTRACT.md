# PROF-H2 — контракт (fix-pass)

Base: navigator `d8f287e` → **`022450b5`**; platform `d2ae82f` → **`afb8d02`**. Branch: `feat/prof-h-profile-redesign`.

## 1. Legacy-профили

| Поведение | Реализация |
|-----------|------------|
| Форма показывает **effective** направления и `partnerSearchVisible` | `profileDraftFromProfile` → `effectiveProductCategoryIds` / `effectiveServiceSpecializationIds` / `effectiveNavigatorStageIds`; checkbox = `partnerSearchVisible` |
| Сохранение имени/контакта не сбрасывает направления/поиск | `buildWorkingProfilePatchBody` — PATCH только изменившихся полей; `partnerSearchOptIn` только при `partnerSearchTouched` |
| PATCH «не передано» vs `[]` | Backend: `validate*Ids` с `provided: false`; frontend diff |
| Раздельный fallback товаров/услуг | `workingProductDirectionsTouched`, `workingServiceDirectionsTouched` (миграция `20261009_prof_h2_direction_touched_split`) |
| L1 в `specializations` | `effectiveNavigatorStageIds` ← legacy L1-only; trade ID не смешиваются |

Тест: `workingProfile.test.ts` — PATCH только `productCategoryIds` при `specializations=['tiles','L1-7']` сохраняет effective services `['tiles']`.

## 2. Валидация PATCH

| Проверка | Где |
|----------|-----|
| Primary vs итоговый набор после PATCH | `buildWorkingProfilePatch` финальная проверка |
| Видимость + рабочий минимум (имя, город, тип, org, ≥1 направление) | `partnerSearchWorkingMinimumError` на enable и projected visible state |
| Неизвестные ID | 400 только на переданные массивы |

Frontend: chip remove вызывает `removePrimaryIfNeeded` (как checkbox).

## 3. Доступ к поиску и контактам

| Аудитория | Поиск |
|-----------|-------|
| Guest | 401 |
| CLIENT | 403 |
| Blocked PRO | 403 |
| PRO без cabinet | 403 `assertCabinetProfAccess` |
| PRO с доступом | 200 + `partnershipContact*` |

Публичный `/api/catalog` — integration: JSON без `partnershipContact*` (при доступной БД).

Unit: `src/app/api/partnership/search/__tests__/route.auth.test.ts` (4 cases).

## 4. Справочник

- Канон L1: `src/lib/navigatorL1Stages.ts` ← `pro/setup` импортирует тот же модуль.
- Picker: полный taxonomy один раз, фильтр локально; chips с префиксами «Товар:» / «Услуга:».

## 5. Поиск

- Activity filters → без `partnerType` narrowing; иначе legacy `role=store|pro` filter.
- Пагинация: `cursor` + `limit` (max 80), sort `lastActiveAt desc, id desc`.
- PartnersHub: «Показать ещё», сброс при смене фильтров.

## 6. Каталог

Working PATCH не меняет live `storeCategories` / `specializations` / `catalogStatus` / `isPublic` (integration test при доступной БД).

## 7. API integration

`profH2WorkingProfileRoutes.integration.test.ts`: создаёт A/B в `remcard_prof_test`, проверяет URL/loopback/`current_database()`, сценарий PATCH→GET→search→opt-out; **нет** `hasFixtures` false-green.

## 8. Frontend tests

Vitest include: `profile-working-save.test.ts`, `working-profile-patch.test.ts`, `ProfileDirectionsPicker.test.tsx`.

## Проверки (fix-pass, 2026-10-09)

| Команда | Exit | Результат |
|---------|------|-----------|
| navigator `pnpm run typecheck` | 0 | PASS |
| navigator `pnpm run lint` | 0 | PASS (pre-existing warnings elsewhere) |
| navigator `vitest` workingProfile + partnershipSearchQuery | 0 | **9** tests PASS |
| navigator `vitest` partnership search route.auth | 0 | **4** tests PASS |
| navigator `profH2WorkingProfileRoutes.integration.test.ts` | 0 | **6 skipped** — PostgreSQL `127.0.0.1:5432` недоступен |
| platform `npm run test:component` | 0 | **73** tests PASS |
| platform `npm run test:proxy` | 0 | **228** tests PASS |
| platform `npm run lint` | 0 | PASS |
| platform `NODE_ENV=production npm run build` | 0 | PASS |

## NOT VERIFIED

- Полный API-сценарий на `remcard_prof_test` (нет БД в прогоне; миграция split не применена).
- Browser 1440×900 / 390×844 с live navigator upstream (taxonomy, save/reload, search, overflow).
- Скриншоты: прежние `docs/screenshots/prof-h2-basics-*` (upstream/fixture).
