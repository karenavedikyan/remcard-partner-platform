# Отчёт: кабинет «Каталог → Товары» (этап 1)

**Ветка:** `cursor/catalog-stage1-cabinet-view-2745` (база `cursor/catalog-stage1-frontend-fix-7a0a`, старт `a3ca1e31`)  
**HEAD SHA:** `3555e1efd1215c52a8c5f04a4b7a13f5e90d9324` (`fe6a0a72` → `53e88e9e` → `3b35b01d` → `3555e1ef`)

## Пункт / что сделано / как проверено

| Пункт | Что сделано | Как проверено |
|-------|-------------|----------------|
| 1. Сегмент «Список / Карточки» и «На весь экран» | Стили `.pc-seg`, `.pc-view`, `.pc-full-btn`, `.pc-cost-btn`, мобильная раскладка 390px | Визуально vs прототип; Playwright `catalog-*_390x844_*` |
| 2. Паритет с прототипом | Дополнены toolbar, строки таблицы, карточки, fullscreen, container queries `pclist`, чипы, found-bar | Скриншоты `1386×719`, `1460×833`, `390×844`, light/dark |
| 3. Вид сотрудника | `snapshotForAudience`, скрытие закупки/филиалов в UI; `assertNoOwnerEconomicsInValue` | `employee-snapshot.test.ts`, `Partner1cModelDetail.test.tsx` |
| 4. SKU из API | `fetchPartnerCatalogModelDetail`, `adaptNavigatorCabinetModelDetail`; список без merge фикстуры; фикстура — fallback | `navigator-model-detail.test.ts`, `navigator-adapter.test.ts` |
| 5. Скриншоты | `catalog-stage1-capture.mjs`: ожидание testid, снятие `[role=alert]`, предупреждение overflow | `artifacts/catalog-reference/out/*.png` |
| 6. Сборка | tsc, build, vitest | см. ниже |

## Vitest (целевой набор)

```bash
npx vitest run src/lib/business-nav/sections.test.ts \
  src/lib/partner-1c-catalog \
  src/components/partner-1c-catalog/Partner1cModelDetail.test.tsx \
  src/app/catalog/dev-fixture/employee-snapshot.test.ts
```

## tsc / build

- `npx tsc --noEmit` — OK
- `npm run build` — OK

## Оставшиеся отличия от прототипа

1. При `source: fixture` (флаг выкл. или fallback) SKU по-прежнему из `optovik-products.json`.
2. Список при live API строится из строк navigator без полного набора свойств фильтра до открытия карточки модели.
3. Иконка пункта меню «Каталог» — упрощённая SVG (как в предыдущем отчёте).
4. Этапы 2/3 не реализованы.