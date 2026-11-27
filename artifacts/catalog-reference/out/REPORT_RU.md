# Отчёт: кабинет «Каталог → Товары» (этап 1, содержимое карточки модели)

**Ветка:** `cursor/catalog-stage1-model-content-4ac7` (база `cursor/catalog-stage1-model-card-mobile-2ec3`, старт `a1dd150`)  
**HEAD SHA:** _(после push — последний коммит ветки)_

## Пункт / что сделано / как проверено

| Пункт | Что сделано | Как проверено |
|-------|-------------|----------------|
| 1. «Филиалы и цены» | Остаток филиала с числом (`в наличии N шт`), блок `pc-brmeta`: «как в 1С» / «своя цена», пересчёт наценки при своей цене | `Partner1cModelDetail.test.tsx`, `models.branch-stock.test.ts`, снимки owner-model |
| 2. «Варианты из 1С» | Абзац-пояснение под таблицей; остаток варианта числом (как было) | Тесты на текст, снимки |
| 3. «Свойства из 1С» | Бренд в цепочке данных (`brand` в фикстуре `p004`, проброс из Navigator detail); абзац под таблицей | `navigator-model-detail.test.ts`, визуально owner-model |
| 4. Права | Без изменений: сотрудник без `pc-money`, `pc-model-branches`, мета цены филиала | `Partner1cModelDetail.test.tsx` |
| 5. Сборка и тесты | — | `npx tsc --noEmit`, vitest (каталог), `npm run lint`, `PARTNER_1C_CATALOG_ENABLED=1 npx next build` |

## Vitest (целевой набор)

```bash
PARTNER_1C_CATALOG_ENABLED=1 npx vitest run \
  src/lib/partner-1c-catalog \
  src/components/partner-1c-catalog \
  src/app/catalog
```

Результат: **27 passed** (9 файлов).

## tsc / build / lint

- `npx tsc --noEmit` — OK  
- `PARTNER_1C_CATALOG_ENABLED=1 npx next build` — OK (`.next/BUILD_ID` присутствует)  
- `npm run lint` — OK (предупреждения только в несвязанных файлах)

## Снимки

```bash
PARTNER_1C_CATALOG_ENABLED=1 npm run dev &
# proto: python3 -m http.server 8765 в artifacts/catalog-reference/prototype
node scripts/catalog-stage1-capture.mjs
```

Обновлены `catalog-{owner,employee}-model_{390x844,1386x719}_{light,dark}.png` (impl и `proto/`).

## Расхождения impl vs прототип (карточка модели)

### Исправлено в этом заходе (данные и тексты)

1. Филиалы: числовой остаток, `pc-brmeta`, пояснение внизу блока (без изменения).
2. Варианты и свойства: тексты-пояснения как в прототипе.
3. Бренд на карточке `p004` / Mona-58 в демо-фикстуре.

### Остаётся

| # | Область | Суть |
|---|---------|------|
| 1 | Демо-модель в capture | Скрипт открывает `p001`, в прототипе эталон визуала часто на `p004` — разный SKU в снимках. |
| 2 | API | В `NavigatorCabinetModelBranch` нет поля остатка по филиалу: для числа в строке филиала используется сумма `stockQuantity` вариантов со `stockKind: KNOWN` и деление по филиалам (как в `product-catalog.js`), а не отдельное поле API. |
| 3 | Оболочка | Dev-fixture без полного кабинета прототипа (sidebar, вкладки заявок и т.д.). |

## Контракт API

Изменений бэкенда не требовалось. При появлении per-branch stock в ответе detail можно заменить демо-`branchStock` на прямое чтение поля (имя поля в контракте `6f54bc52` пока не зафиксировано в типах).