# Отчёт: этап 1 каталога партнёра из 1С

**Ветка:** `cursor/catalog-stage1-20261127`  
**HEAD SHA:** `14c9d869` (отчёт и скриншоты в коммите `chore(catalog): тесты в vitest…`)

## Флаг и регрессия

- Каталог включается только при `PARTNER_1C_CATALOG_ENABLED=1` (по умолчанию выключен).
- Пункт меню «Каталог», маршруты `/catalog`, preview и режим «Из каталога» в калькуляторе — за флагом.

## Принятие (пункт → что сделано → тест)

| Пункт ТЗ | Что сделано | Тест |
|----------|-------------|------|
| Кабинет: «Каталог → Товары», фильтры 1С, поиск, сортировка, карточки/список, групповые действия, полноэкранный режим, статусы модели | `Partner1cCatalogWorkspace`, `Partner1cItemsTab`, `Partner1cFilterPanel`, lib `lk.ts` | `lk.test.ts`, скриншоты `catalog-owner_*` |
| Закупка/наценка и вкладка «Филиалы и цены» в карточке — только владельцу | `Partner1cModelDetail`, `api.ts` strip cost для сотрудника | `Partner1cModelDetail.test.tsx`, `api.test.ts` |
| Сотрудник с правом catalog видит раздел; без права — нет в меню | `gate.ts`, nav filter | `gate.test.ts` |
| «Вид на сайте» | `Partner1cSitePreviewTab`, iframe `/preview/client-catalog/s6` | скриншоты owner tab site |
| Клиентский сайт: вкладка «Товары» продавца, фильтры, карточка, «Где купить» | `/preview/client-catalog/s6`, `/preview/client-catalog/p/[id]`, `ClientWhereToBuy` | скриншоты `client-seller_*`, `client-product_*` |
| Калькулятор: «Из каталога» из опубликованных дверей | `door-models.ts`, `resolveDoorCatalogModels()`, doors page prop | `doorCalculator` existing tests + flag gate |
| Миграции БД не применять | stub SQL (локально `artifacts/catalog-reference/migrations/*.sql`, в .gitignore) | ручная проверка пути в отчёте |
| tsc / next build / vitest | | `npx tsc --noEmit`, `npm run build`, `npm run test:component` по `partner-1c-catalog` |

## Скриншоты

Каталог: `artifacts/catalog-reference/out/` — 4 экрана × 3 viewport × 2 темы (рядом с прототипом сверять по `artifacts/catalog-reference/prototype/`).

Захват: `PARTNER_1C_CATALOG_ENABLED=1 node scripts/catalog-stage1-capture.mjs`

## Расхождения с прототипом (осознанные)

1. **Вкладки этапа 2/3** — нет «Заявки», «Поставщики», «Обмен с 1С», отдельной вкладки «Филиалы и цены» (настройка филиалов в карточке модели сохранена, как в прототипе).
2. **Поставщики / catalog-suppliers** — демо-модели поставщика (t001…) не перенесены.
3. **Клиентский preview** — в prof-репозитории, не на remcard.ru; визуал и фильтры через общий `lk.ts`.
4. **Тип цены филиала / обмен 1С** — демо-состояние в памяти, без API navigator.
5. **Иконка меню «Каталог»** — упрощённая SVG, не Lucide из прототипа.
6. **Число позиций в демо-баннере** — 20 моделей фикстуры vs «4762 позиции» в тексте прототипа (цифра баннера привязана к фикстуре).

## Требует миграции или отдельного разрешения

- Таблицы публикации каталога 1С, цен по филиалам, снимков обмена — stub `20261127120000_partner_1c_catalog_stub.sql` (не в git из‑за `*.sql` в .gitignore).
- Включение `PARTNER_1C_CATALOG_ENABLED=1` на prof.
- Реальный API remcard-navigator вместо `fetchPartnerCatalogSnapshot` mock.
- Публичные маршруты каталога на remcard.ru (вне этого репозитория).
- Откат merge на `main` (если требуется): посторонний merge `8b0b78a9` не входил в ТЗ ветки.