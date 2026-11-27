# Отчёт: филиалы каталога по API (реальные branchId)

**Ветка:** `cursor/catalog-fe-real-branches-c029` (база `cursor/catalog-stage1-fe-branch-stock-api-34b5`, старт `4be10fa3c991b105327131a8bf31d40179a4a53b`)  
**Бэкенд-контракт (только чтение):** `remcard-navigator` `cursor/catalog-be-prisma-fixes-3cb5` — `meta.branches[]`, `models/{id}.branches[]` по `branchId`  
**HEAD SHA:** `ba626945`

## Пункт / что сделано / как проверено

| Пункт | Что сделано | Как проверено |
|-------|-------------|----------------|
| 1. Источник филиалов | `PartnerCatalogSnapshot.branches` из `meta.branches` (navigator) или `demoCatalogBranches()` (fixture); сопоставление остатков и цен строго по `branchId` | `navigator-adapter.test.ts`, `branches.test.ts` |
| 2. Убраны индекс / адрес / суффикс `-N` | Удалены `BRANCHES`/`BRANCH_IDS` из `constants.ts`; `mapNavigatorBranchesToStockRecord` без парсинга id | `models.branch-stock-api.test.ts` (cuid id) |
| 3. PublicationState по id | `branchOff`/`branchPrice`/`branchPct` на `branchId`; payload-хелперы для publication / branch-prices / branch-rules | `publication-payload.test.ts` |
| 4. UI | Фильтр, таблица, карточка модели, «Филиалы и цены» используют `snapshot.branches`; 0 филиалов — без падения | `Partner1cModelDetail.test.tsx`, capture |
| 5. Демо-фикстура | 6 филиалов `optovik-branch-0…5` только через `demo-branches.ts` | dev-fixture без `branchSet` (визуально как раньше) |
| 6. Крайние случаи | 0/1/10 филиалов, филиал только в meta или только в detail | `branches.test.ts`, fixtures `cabinet-meta-branches-real*.json` |
| 7. Права | Без изменений: закупка и «Филиалы и цены» — владельцу | `Partner1cModelDetail.test.tsx`, `employee-snapshot.test.tsx` |

## Vitest

```bash
PARTNER_1C_CATALOG_ENABLED=1 npx vitest run \
  src/lib/partner-1c-catalog \
  src/components/partner-1c-catalog \
  src/app/catalog \
  src/lib/client-catalog
```

Результат: **48 passed** (12 файлов), включая cuid id без шаблона `-N`, 0/1/10 филиалов, detail-only / meta-only, payload с реальными `branchId`, сотрудник без закупки.

## tsc / build / lint

- `npx tsc --noEmit` — OK  
- `PARTNER_1C_CATALOG_ENABLED=1 npx next build` — OK (`.next/BUILD_ID`)  
- `npm run lint` — OK (предупреждения только в несвязанных файлах)

## Фикстуры API

- Демо: `demo-branches.ts`, `fixtures/cabinet-model-detail-owner-branches.json`  
- Реальные id (cuid-подобные): `fixtures/cabinet-meta-branches-real.json`, `cabinet-meta-branches-real-10.json`, `cabinet-model-detail-real-3branches.json`, `cabinet-model-detail-real-10branches.json`

Dev-fixture:

- Демо как раньше: `/catalog/dev-fixture?role=owner`
- 3 / 10 филиалов с cuid: `?branchSet=real3|real10&model=p004`
- API-остаток (демо id): `?branchStock=known|unknown&model=p004`

## Снимки (390×844 и 1386×719)

```bash
PARTNER_1C_CATALOG_ENABLED=1 npm run dev &
node scripts/catalog-stage1-capture.mjs
```

- Демо-фикстура (без изменений вида): `catalog-*-table*`, `catalog-*-model*`, `catalog-*-branch-known|unknown_*`
- Реальные id: `catalog-owner-table-real3_*`, `catalog-owner-model-real3_*`, `catalog-owner-table-real10_*`, `catalog-owner-model-real10_*`

## Контракт API

Фронт читает список филиалов из `GET …/partner-products` → `meta.branches[]` и остатки из `GET …/models/{id}` → `branches[]`; любые операции публикации/цен отправляют `branchId` из API, не индекс и не распознавание суффикса id.