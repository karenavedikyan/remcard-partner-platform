# Отчёт: кабинет «Каталог → Товары» (этап 1, карточка модели 390px)

**Ветка:** `cursor/catalog-stage1-model-card-mobile-2ec3` (база `cursor/catalog-stage1-build-shots-bb5c`, старт `8b8145e4`)  
**HEAD SHA:** `ad2d360cca45052db687d07647021926b809db5d`

## Пункт / что сделано / как проверено

| Пункт | Что сделано | Как проверено |
|-------|-------------|----------------|
| 1. Вёрстка карточки модели (390×844) | В `Partner1cCatalog.module.css` перенесены стили прототипа: галерея и миниатюры, `pc-price`, плитки `pc-figs`, таблицы `pc-table` / `pc-disc` как карточки на ≤680px, филиалы `pc-brrow` как карточки на мобиле, `pc-specs` (подпись слева — значение справа), чекбоксы и поля цены филиала | Снимки `catalog-{owner,employee}-model_390x844_{light,dark}.png` vs `proto/`; overflow guard в `catalog-stage1-capture.mjs` |
| 2. Горизонтальный скролл | `overflow-x: clip` на обёртках таблиц, `min-width: 0` у таблиц на мобиле | Capture не падает на `assertNoMobileOverflow` для model @ 390 |
| 3. Снимки | Обновлены impl и proto: model/table/cards, 1386×719 и 390×844, light/dark | `node scripts/catalog-stage1-capture.mjs` |
| 4. Права | Логика не менялась: сотрудник без `pc-money` и `pc-model-branches` | `Partner1cModelDetail.test.tsx`, снимки employee-model |
| 5. Сборка и тесты | — | `npx tsc --noEmit`, vitest (каталог), `npm run lint`, `PARTNER_1C_CATALOG_ENABLED=1 npx next build` |

## Vitest (целевой набор)

```bash
PARTNER_1C_CATALOG_ENABLED=1 npx vitest run \
  src/lib/partner-1c-catalog \
  src/components/partner-1c-catalog \
  src/app/catalog
```

Результат: **21 passed** (8 файлов).

## tsc / build / lint

- `npx tsc --noEmit` — OK  
- `PARTNER_1C_CATALOG_ENABLED=1 npx next build` — OK (`.next/BUILD_ID` присутствует)  
- `npm run lint` — OK (предупреждения только в несвязанных файлах)

## Расхождения impl vs прототип (карточка модели @ 390px)

### Исправлено в этом заходе (только CSS)

1. «Закупка и наценка»: плитки 2×2, скидки 5–20 % — отдельные карточки со строками «Цена со скидкой» / «Ваш доход с единицы» / «Наценка».
2. «Филиалы и цены»: карточка на филиал, чекбокс не налезает на адрес, оформленное поле цены.
3. «Варианты из 1С» и «Свойства из 1С»: карточки/пары подпись–значение вместо широкой таблицы.
4. Верх: галерея, заголовок, цена, кнопки действий, «Ко всем товарам».

### Остаётся (вне рамки «только вёрстка»)

| # | Область | Суть |
|---|---------|------|
| 1 | Филиалы | В прототипе под ценой строка `pc-brmeta` («наценка …% · …₽») — в impl нет соответствующей разметки/логики `branchMeta` (не добавлялось). |
| 2 | Оболочка | Dev-fixture без полного кабинета прототипа (sidebar, вкладки заявок и т.д.). |
| 3 | Данные | Другая демо-модель в фикстуре (`p001`) vs визуал прототипа; 20 vs 21 моделей. |
| 4 | Таблица списка | Паритет списка товаров — в ветке `build-shots` (наценка «+N ₽», филиалы сотрудника и т.д.). |