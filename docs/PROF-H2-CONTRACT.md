# PROF-H2 — контракт (fix-pass)

Base: navigator `9523dcd` → HEAD fix-pass; platform `d2ae82f` → HEAD fix-pass. Branch: `feat/prof-h-profile-redesign`.

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

Публичный `/api/catalog` — тест: JSON без `partnershipContact*`.

## 4. Справочник

- Канон L1: `src/lib/navigatorL1Stages.ts` ← `pro/setup` импортирует тот же модуль.
- Picker: полный taxonomy один раз, фильтр локально; chips с префиксами «Товар:» / «Услуга:».

## 5. Поиск

- Activity filters → без `partnerType` narrowing; иначе legacy `role=store|pro` filter.
- Пагинация: `cursor` + `limit` (max 80), sort `lastActiveAt desc, id desc`.
- PartnersHub: «Показать ещё», сброс при смене фильтров.

## 6. Каталог

Working PATCH не меняет live `storeCategories` / `specializations` / `catalogStatus` / `isPublic` (integration test при доступной БД).

## Проверки (fix-pass)

| Команда | Exit | Результат |
|---------|------|-----------|
| navigator `pnpm run typecheck` | 0 | PASS |
| navigator `vitest` workingProfile + partnershipSearchQuery | 0 | PASS |
| navigator `profH2WorkingProfileRoutes.integration.test.ts` | skip / — | **NOT VERIFIED** — `127.0.0.1:5432` недоступен в прогоне |
| platform `npm run test:component` | 0 | **73** tests PASS |
| platform `npm run test:proxy` | см. прогон | PASS |
| platform `NODE_ENV=production npm run build` | 0 | PASS |

Скриншоты прежние (`docs/screenshots/prof-h2-basics-*`); browser с live upstream — **NOT VERIFIED** в fix-pass.
