# PROF-F — приёмка (fix-pass 3: published visibility + staging)

## Ветки

| Репозиторий | Feature branch |
|-------------|----------------|
| remcard-navigator | `feat/prof-f-profile-catalog-team` |
| remcard-partner-platform | `feat/prof-f-profile-catalog-team` |

База для сравнения с Computer-воспроизведением: navigator `f4caf30`.

## Исправленные дефекты

1. **Публичность отделена от статуса модерации:** User — `isPublic` + не `REJECTED`; Organization/Branch — `catalogPublished`. Submit в `PENDING` не снимает опубликованный снимок.
2. **Staging на всём lifecycle:** правки каталога в draft при live public; `PATCH` каталога при `PENDING` → **409**; approve применяет `catalogUnderReview` / draft без `catalogDraftPending` в Prisma.
3. **Admin branch approve:** `buildBranchApproveUpdate` (frozen snapshot).

## Проверка HTTP (без моков Prisma, lifecycle только API)

Сервер: `PORT=3401`, `DATABASE_URL=…/remcard_prof_test`, `REMCARD_DEPLOYMENT=staging` + Basic auth из `.env.local`.

```bash
cd remcard-navigator
export $(grep -v '^#' .env.local | xargs)
PORT=3401 pnpm exec next dev -p 3401   # отдельный терминал
BASE_URL=http://127.0.0.1:3401 pnpm exec tsx scripts/prof-f-catalog-http-regression.ts
```

Артефакт прогона: `/opt/cursor/artifacts/prof-f-catalog-http-regression.json`

| Сущность | Ключевые HTTP | Ожидание | Результат |
|----------|---------------|----------|-----------|
| User | GET `/api/catalog?page=1` → PATCH profile draft → submit → GET catalog → PATCH PENDING → revise → PATCH → resubmit | Видимость до approve; PENDING PATCH **409**; live не меняется; `isPublic` true после resubmit | **PASS** |
| Organization | GET `/api/catalog/org/[id]` → PATCH org → POST submit → GET org → PATCH PENDING | **200** после submit; PATCH **409** | **PASS** |
| Branch | GET `/api/catalog/branch/[id]` → PATCH → POST submit → GET branch → PATCH PENDING | **200** после submit; PATCH **409** | **PASS** |

`current_database()` при прогоне: `remcard_prof_test` (см. также `catalog-publication-integration.log`).

## Интеграционные тесты (Vitest + PG)

```bash
export $(grep -v '^#' .env.local | xargs)
pnpm exec vitest run src/lib/__tests__/catalogPublicationRoutes.integration.test.ts
```

7/7 **PASS** (route handlers + PostgreSQL).

## Unit / build

```bash
pnpm exec vitest run --exclude '**/*.integration.test.ts'   # navigator
npm run test                                                 # platform
```

## БД / миграции

- Для пустой изолированной БД: `prisma db push` (исправлены `@db.Uuid` на `BranchService.serviceId`, `Review.serviceId`).
- Не использовать `migrate resolve` / baseline на неизвестном production `DATABASE_URL`.
- Computer-воспроизведение на `f4caf30` использовало SQL `20261008193000_catalog_publication_draft` + generate — это **не** эквивалент полной цепочки migrate deploy.

## UI (platform)

- Org/branch: подписи «виден / не опубликован / черновик» в филиалах и карточке филиала.
- SOLO: `ProfileSoloPartnerEmployeeCard` + GET/PATCH `/api/pro/employees`.

## Browser 1440/390

**NOT VERIFIED** в этой сессии (HTTP + PG закрыты).

## HEAD (после push)

| Репозиторий | SHA |
|-------------|-----|
| remcard-navigator | `3a7e48d` |
| remcard-partner-platform | `6cc2858` |
