# Отчёт: этап 1 каталога партнёра (frontend fix)

**Ветка:** `cursor/catalog-stage1-frontend-fix-7a0a` (от `cursor/catalog-stage1-20261127`, база `d9af44fe`)  
**HEAD SHA:** `999eb706305428a3c4abf69d11d47bfae44fed88` (цепочка: `2f8484bf` → `e5cad940` → `946368f0` → `999eb706`)  

## Флаг

- `PARTNER_1C_CATALOG_ENABLED=1` — каталог, preview, калькулятор «Из каталога».
- При включённом флаге `fetchPartnerCatalogSnapshotLive` ходит в navigator `/api/pro/organization/partner-products*`; при ошибке или пустом ответе — фикстуры.

## Допущения по API navigator (ветка `cursor/catalog-stage1-20261127`)

- Кабинет: `GET /api/pro/organization/partner-products` → `{ models, meta, settings }` (`serialize.ts`); публичный список — `{ settings, filter, options, summary, items }` (`publicDto.ts`).
- Детальные SKU для UI по-прежнему обогащаются из фикстуры `optovik-products.json` по `model.id` до стабилизации полного DTO.
- `GET .../access` → `{ enabled, canAccess, isOwner?, code?, error? }`.

## Пункт / что сделано / как проверено

| Пункт | Что сделано | Как проверено |
|-------|-------------|----------------|
| 1. `/preview/client-catalog/s6` | `parseClientPreviewHidden` в `src/lib/client-catalog/preview-hidden.ts` | `curl` 200 на dev, скриншоты `client-seller_*` |
| 2. Карточка `p004` | Сетка `.pd`, `overflow-x: clip`, стили specs | Playwright `scrollWidth===390` на 390×844; `client-product_*` |
| 3. Кабинет «Товары» + сотрудник | `.stats` grid, `pc-list--staff`, скрыты филиалы/закупка у staff | `catalog-employee_*`, `data-testid=pc-model-*` count 20 |
| 4. API adapter | `navigator-adapter.ts`, `api.ts` live fetch, proxy allowlist | `navigator-adapter.test.ts`, `api.test.ts` |
| 5. Ошибки публикации/филиала | `catalog-access.ts`, цены `—` при `publicationPricesBlocked`, hint «выберите филиал» | `catalog-access.test.ts` |
| 6. Калькулятор «Из каталога» | Без изменений: `resolveDoorCatalogModels()` + флаг | `door-models.ts`, существующие тесты |
| 7. `sections.test.ts` | «Каталог» в BUSINESS_OWNER_CORE | `vitest` 4/4 |
| 8. tsc / build | — | `npx tsc --noEmit`, `npm run build` |
| 9. Скриншоты | `scripts/catalog-stage1-capture.mjs` | `artifacts/catalog-reference/out/*` |

## Vitest (целевой набор)

```
npx vitest run src/lib/business-nav/sections.test.ts src/lib/partner-1c-catalog src/components/partner-1c-catalog/Partner1cModelDetail.test.tsx
→ 7 files, 20 passed
```

## tsc / build

- `npx tsc --noEmit` — OK  
- `npm run build` — OK  

## Отличия от прототипа (осознанные)

1. SKU/варианты при live API — из фикстуры, пока navigator не отдаёт полный номенклатурный срез в list.
2. Иконка меню «Каталог» — упрощённая (как в предыдущем отчёте).
3. Этапы 2/3 (заявки, поставщики, обмен 1С) не делались.

## Регрессия prod

- Флаг выключен → прежнее поведение (калькулятор без каталога, нет `/catalog`).