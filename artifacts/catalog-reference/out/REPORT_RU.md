# Отчёт: кабинет «Каталог → Товары» (этап 1, сборка и снимки)

**Ветка:** `cursor/catalog-stage1-build-shots-bb5c` (база `cursor/catalog-stage1-cabinet-view-2745`, старт `bdc92901`)  
**HEAD SHA:** `8cae78cab838a010b505d533b77b94afe26445d9`

## Пункт / что сделано / как проверено

| Пункт | Что сделано | Как проверено |
|-------|-------------|----------------|
| 1. Сборка | `employee-snapshot.test.ts` → `.tsx` (JSX в vitest); `rg '<[A-Z]'` по `*.test.ts` этапа 1 — других JSX в `.ts` нет | `npx next build`, наличие `.next/BUILD_ID`; vitest |
| 2. Снимки impl | `catalog-stage1-capture.mjs`: таблица, «Карточки», карточка модели; owner/employee; 1386×719 и 390×844; light/dark; `fullPage`; снятие `[role=alert]`; overflow guard на 390 | `artifacts/catalog-reference/out/catalog-*_{table,cards,model}_*.png` |
| 3. Снимки proto | Парные кадры в `out/proto/` (те же slug и размеры); прототип `partner/index.html?role=…&open=goods&dataset=demo` | `artifacts/catalog-reference/out/proto/*.png` |
| 4. Паритет таблицы | Наценка: «+N ₽ с шт.» в списке; колонка «Филиалы» у сотрудника; подпись остатка по филиалам; кнопка `pc-brbtn` у владельца | Снимки + визуальное сравнение с `proto/` |
| 5. Тесты | Без новых падений | vitest, `npx tsc --noEmit`, `npx next build` |

## Vitest (целевой набор)

```bash
PARTNER_1C_CATALOG_ENABLED=1 npx vitest run src/lib/business-nav/sections.test.ts \
  src/lib/partner-1c-catalog \
  src/components/partner-1c-catalog/Partner1cModelDetail.test.tsx \
  src/app/catalog/dev-fixture/employee-snapshot.test.tsx
```

## tsc / build

- `npx tsc --noEmit` — OK  
- `PARTNER_1C_CATALOG_ENABLED=1 npx next build` — OK (`.next/BUILD_ID` присутствует)

## Расхождения impl vs прототип (таблица и карточка модели)

### Исправлено в вёрстке (этот заход)

1. Колонка «Наценка» в списке: добавлена вторая строка «+N ₽ с шт.» как в прототипе.
2. Сотрудник: в таблице снова видна колонка «Филиалы» (только текст, без закупки/наценки).
3. Остаток: подпись «все филиалы» / «филиалов: N из 6» под статусом наличия.
4. Владелец: кнопка филиалов `pc-brbtn` с иконкой (открывает карточку модели для правки филиалов).

### Остаётся (перечень)

| # | Область | Суть |
|---|---------|------|
| 1 | Оболочка | Прототип — полный кабинет (sidebar, topbar, вкладки «Заявки», «Филиалы и цены», «Поставщики», «Обмен с 1С»); impl — dev-fixture и только «Товары» + «Вид на сайте» (этап 1 по ТЗ). |
| 2 | Данные | В фикстуре 20 моделей, в прототипе 21; средняя наценка 51 % vs 52 % — разный состав демо-выборки. |
| 3 | Логика | Диалог массового редактирования филиалов из списка (`branches:` в прототипе) не реализован — кнопка ведёт в карточку модели. |
| 4 | Источник SKU | При `source: fixture` SKU из `optovik-products.json`; при live API — navigator без полного набора фильтров до открытия карточки. |
| 5 | Прочее | Иконка пункта меню «Каталог» упрощённая; этапы 2/3 не делались. |