# M1: диагностика schema bootstrap (локальный navigator)

Дата: 6 октября 2026. Navigator SHA: `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7`. Изменений в navigator **не вносилось**.

## Симптомы

| Команда | Результат на пустой БД `remcard_prof_test` |
| --- | --- |
| `prisma migrate deploy` | Падает на первой incremental-миграции `20260325120000_add_pro_mode`: `relation "User" does not exist` |
| `prisma db push` | Падает на FK `BranchService_serviceId_fkey`: `serviceId text` ссылается на `Service.id uuid` |

Успешный dev-запуск с **пропущенными** FK **не доказывает** корректность полной схемы.

## Почему migrate deploy не работает «с нуля»

1. Каталог `prisma/migrations` содержит 96 incremental-миграций, но **нет** начальной миграции `CREATE TABLE "User"`.
2. Первая по timestamp миграция `20260325120000_add_pro_mode` делает `ALTER TABLE "User"`, предполагая legacy-базу до Prisma Migrate.
3. Production/staging navigator, вероятно, получил baseline до появления этих файлов; на пустой PostgreSQL цепочка не самодостаточна.

## Почему db push не работает

В актуальном `schema.prisma`:

- `Service.id` — `@db.Uuid`
- `BranchService.serviceId` — `String` без `@db.Uuid`
- `Review.serviceId` — `String?` без `@db.Uuid`

`prisma migrate diff --from-empty` генерирует SQL, который падает на:

```sql
ALTER TABLE "BranchService" ADD CONSTRAINT "BranchService_serviceId_fkey" ...
-- ERROR: text vs uuid
```

Аналогичный риск для `Review.serviceId_fkey`.

## Что было сделано локально (обход, вне navigator)

Для M1 smoke-test использовался **внешний** patched bootstrap SQL (не в этом репозитории), где пропущены только конфликтные FK:

- `BranchService_serviceId_fkey`
- `Review_serviceId_fkey`

Таблицы `BranchService` и `Review` созданы, но указанные связи **не enforced**. Это допустимо только для локальной проверки fixture-сессии, **не** для production baseline.

## Минимальный корректный baseline (следующее действие в navigator, вне M1)

1. **Squash/baseline migration** от пустой БД до текущей схемы **или** checked-in SQL snapshot с проверкой FK.
2. **Выровнять типы** `BranchService.serviceId` / `Review.serviceId` с `Service.id` (`@db.Uuid` или изменить тип `Service.id`).
3. Документировать supported path: `migrate deploy` vs `db push` для новых разработчиков.
4. До исправления — локальный M1 ограничен patched bootstrap + `scripts/local/seed-m1-fixtures.sql.example`.

## Что не делать

- Не переносить patched bootstrap SQL в публичный partner-platform repo.
- Не считать FK-skipped install доказательством production-ready schema.
- Не править все 96 миграций в рамках M1 partner-platform.
