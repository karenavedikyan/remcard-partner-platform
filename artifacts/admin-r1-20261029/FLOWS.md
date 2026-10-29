# Admin R1 — flows (вне deployed assets)

## Вход
1. `/login?mode=admin` → staff session → `/admin/overview`.
2. Partner/org context не получает admin API (401/403 server-side).

## Навигация R1
- Видны: Обзор, Партнёры, Клиенты, Команда, Модерация, Аналитика, Результативность, Уведомления, Настройки.
- Скрыты: Задачи (R2), кураторы, global search, geography, success-coefficient, factories/builders.
- Переключатель релизов прототипа **не** активирует R2/R3 в production; UI фиксирован на Релиз 1.

## Реестр и карточка
1. `/admin/partners` — registry + facets/paging (existing).
2. «Карточка R1» → `/admin/partners/:id` — факты + RemScore + независимые статусы.
3. Партнёрства / модерация / lifecycle — через существующие preview+confirm.

## Клиенты / команда / журнал
- `/admin/clients` — User CLIENT list; без синтетических stage.
- `/admin/team` — StaffRole only.
- `/admin/settings` → Журнал — AuditLog без meta/PII dump.

## Результативность
- RemScore tab / certificates / deals(=Order) / reviews queue (read in QA).
- Certificate без Order ≠ сделка.

## QA запреты
- Не approve/reject/send/team-change/lifecycle apply против production.
- Screenshots: LOCAL FIXTURE.

## Regression touched
- Existing overview/partners/moderation/notifications pages render inside AdminR1Shell.
- AdminShellIsolation: no partner notification hook in admin layout.
- BFF allowlist exact admin R1 routes only.
