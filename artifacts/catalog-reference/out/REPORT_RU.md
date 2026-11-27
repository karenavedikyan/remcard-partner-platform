# Отчёт: остаток по филиалу в карточке модели (этап 1)

**Ветка:** `cursor/catalog-stage1-fe-branch-stock-api-34b5` (база `cursor/catalog-stage1-model-content-4ac7`, старт `5337cdb`)  
**Бэкенд-контракт (только чтение):** `remcard-navigator` `cursor/catalog-stage1-be-branch-stock-brand-feda` — `branches[].stockKind`, `branches[].stockQuantity`  
**HEAD SHA:** `0653bb69`

## Пункт / что сделано / как проверено

| Пункт | Что сделано | Как проверено |
|-------|-------------|----------------|
| 1. Типы API | В `NavigatorCabinetModelBranch` добавлены `stockKind` и `stockQuantity`; на модели кабинета — `branchStocksFromApi` | `navigator-model-detail.test.ts`, `tsc` |
| 2. Адаптер | `adaptNavigatorCabinetModelDetail` кладёт остаток по `branchId` в порядок филиалов кабинета (`mapNavigatorBranchesToCabinetStock`) | `models.branch-stock-api.test.ts` (в т.ч. перестановка ответа) |
| 3. Подписи UI | `formatBranchStockLabel`: KNOWN>0, ZERO/0, UNKNOWN/нет поля → «нет данных»; excluded и снятый филиал — «товар здесь не представлен» | `models.branch-stock-api.test.ts`, `Partner1cModelDetail.tsx` |
| 4. Фикстура без API | Без `branches[]` в ответе остаётся деление суммарного остатка вариантов (`branchStock`) | `models.branch-stock.test.ts` |
| 5. Права | Закупка, «Филиалы и цены» и `pc-money` только владельцу; остаток в API доступен в адаптированной модели и для сотрудника | `Partner1cModelDetail.test.tsx`, capture employee |
| 6. Сборка | — | `tsc`, vitest, `npm run lint`, `PARTNER_1C_CATALOG_ENABLED=1 npx next build` |

## Vitest (целевой набор)

```bash
PARTNER_1C_CATALOG_ENABLED=1 npx vitest run \
  src/lib/partner-1c-catalog \
  src/components/partner-1c-catalog \
  src/app/catalog
```

Результат: **38 passed** (10 файлов), включая сценарии KNOWN / ZERO / UNKNOWN / нет поля / excluded / branchId при другом порядке / сотрудник без закупки.

## tsc / build / lint

- `npx tsc --noEmit` — OK  
- `PARTNER_1C_CATALOG_ENABLED=1 npx next build` — OK (`.next/BUILD_ID`)  
- `npm run lint` — OK (предупреждения только в несвязанных файлах)

## Фикстуры API (образцы navigator)

Для тестов и capture: `src/lib/partner-1c-catalog/fixtures/cabinet-model-detail-owner-branches.json` (по мотивам `artifacts/catalog-stage1-be-branch-stock/cabinet-model-detail-{owner,staff}.json` в remcard-navigator).

Dev-fixture: `?branchStock=known|unknown&model=p004` подмешивает detail с API-остатками.

## Снимки (390×844 и др.)

```bash
PARTNER_1C_CATALOG_ENABLED=1 npm run dev &
# proto: python3 -m http.server 8765 в artifacts/catalog-reference/prototype
node scripts/catalog-stage1-capture.mjs
```

Обновлены базовые `catalog-{owner,employee}-model_*` и добавлены ветки остатка:

- `catalog-owner-model-branch-known_390x844_{light,dark}.png`
- `catalog-owner-model-branch-unknown_390x844_{light,dark}.png`
- `catalog-employee-model-branch-known_390x844_{light,dark}.png`
- `catalog-employee-model-branch-unknown_390x844_{light,dark}.png`

(Также полный набор 1386×719 для тех же сценариев.)

## Контракт API

Фронт читает per-branch `stockKind` / `stockQuantity` из GET `/api/pro/organization/partner-products/models/{id}`; при `UNKNOWN`, `null` или отсутствии полей показывается **«нет данных»** (не демо-числа из фикстуры).