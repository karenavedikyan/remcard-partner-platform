# PROF-H2 — контракт рабочего профиля и внутреннего поиска

## Reuse-map

| Область | Backend (navigator) | Frontend (platform) |
|--------|---------------------|---------------------|
| Рабочий минимум | `PATCH /api/pro/profile` (`city`, `partnerType`, `areas`, working-поля) | `profile-working-save.ts`, раздел «Основные данные» |
| Справочник | `GET /api/pro/partner-taxonomy` ← `storeCategories.ts`, `specializations.ts`, `navigatorRenovationStages.ts` | `ProfileDirectionsPicker`, `PartnerSearchFilters` |
| Видимость в поиске | `partnerSearchOptIn` + `partnerSearchOptInExplicit` + legacy | переключатель «Показывать партнёрам в RemCard» |
| Публичный каталог | `catalogPublication`, `catalogDraft`, `submitForModeration` | раздел «Каталог RemCard» (без изменений H2) |
| Поиск партнёров | `GET /api/partnership/search` | `PartnersHub` вкладка «Найти в RemCard» |

## Поле → источник → владелец → сохранение → аудитория → поиск → модерация

| Поле | Источник данных | Владелец | Сохранение | Аудитория | Внутренний поиск | Модерация каталога |
|------|-----------------|----------|------------|-----------|------------------|-------------------|
| Имя представителя | `User.displayName` | PRO owner | `PATCH /api/auth/me` | кабинет, партнёры | по `q` | нет |
| Тип партнёра | `User.partnerType` | owner | `PATCH /api/pro/profile` | кабинет | нет (только role= фильтр стороны) | нет |
| Название организации | `Organization.name` | owner | `PATCH /api/pro/organization` | кабинет, партнёры | по `q` | org catalog |
| Город | `User.city` | owner / employee — city в working patch запрещён employee | `PATCH /api/pro/profile` | кабинет, поиск | `city` | нет |
| Товары (рабочие) | `User.workingProductCategoryIds` | owner | `PATCH` `productCategoryIds` | PRO | `product` | **нет** |
| Услуги (рабочие) | `User.workingServiceSpecializationIds` | owner | `PATCH` `serviceSpecializationIds` | PRO | `service` | **нет** |
| Этапы | `User.workingNavigatorStageIds` | owner | `PATCH` `navigatorStageIds` | PRO | `stage` | **нет** |
| Основное направление | `User.workingPrimaryDirection` JSON | owner | `PATCH` `primaryDirection` | PRO (UI) | нет | **нет** |
| Территории | `User.areas` | owner | `PATCH` `areas` | PRO | нет | нет |
| Формат работы | `User.partnerWorkMode` | owner | `PATCH` | PRO | нет | нет |
| Контакты сотрудничества | `partnershipContact*` | owner | `PATCH` | PRO в выдаче поиска | нет | **не в catalog*** |
| Видимость поиска | `partnerSearchOptIn` + explicit | owner | `PATCH` `partnerSearchOptIn` | PRO | gate where | **не isPublic** |
| Каталог specializations/storeCategories | live + `catalogDraft` | owner | catalog PATCH / draft | remcard.ru после approve | legacy fallback directions | **да** |

\* Публичные контакты каталога (`publicEmail`, `publicPhone`, …) остаются в catalog PATCH и не смешиваются с `partnershipContact*`.

## Единый справочник

- ID товаров: `STORE_CATEGORY_CHIP_KEYS` / `storeCategories.ts`
- ID услуг: `SPECIALIZATIONS[].value` / `specializations.ts` (trade keys)
- ID этапов: `NAVIGATOR_RENOVATION_STAGES` / L1-0…L1-11
- Пространства раздельны: `product:doors` ≠ `service:doors` (на API — отдельные массивы)

## Legacy

- До `workingDirectionsTouched` поиск по товарам/услугам использует live `storeCategories` / trade-часть `specializations`.
- До `partnerSearchOptInExplicit` видимость в поиске = прежнее `catalogStatus=APROVED && isPublic`.
- После явного выключения opt-in legacy fallback **не** возвращает профиль в выдачу.

## Миграция

- `prisma/migrations/20261009_prof_h2_working_profile/migration.sql` — additive колонки на `User`.
- Применена на `remcard_prof_test@127.0.0.1` (exit 0). Production — **не применялась**.

## Проверки

| # | Сценарий | Статус |
|---|----------|--------|
| 1–7 | unit `workingProfile.test.ts` | PASS |
| 8–11 | unit + integration stub (fixtures absent → soft assert) | PASS unit; E2E search A→B **NOT VERIFIED** (нет seed users m2fix-* в test DB) |
| 12 | employee block on working fields | PASS (расширен `PARTNER_CATALOG_FIELDS`) |
| 13 | `partnershipSearchQuery.test.ts` AND/OR | PASS |
| 14 | working PATCH не вызывает catalog draft | PASS (split patch) |
| 15 | H1 dirty/overflow | PASS tests; fixture overflow 390 PASS (browser) |
| Browser basics UI | fixture 1440/390 | PASS layout; taxonomy **NOT VERIFIED** save (no upstream in fixture) |
| Platform test/build | `npm run test`, `NODE_ENV=production npm run build` | PASS |

Скриншоты: `docs/screenshots/` → `/opt/cursor/artifacts/screenshots/prof-h2-basics-1440.png`, `prof-h2-basics-390.png`.
