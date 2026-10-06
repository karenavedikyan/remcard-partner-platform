# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M2: профиль и партнёры).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m2-prof-partners-b3e3` (base: `cursor/m1-foundation-aa2d`) | M2 в работе |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only |
| Прототип (live static) | https://pro.remcard.ru/ | Design tokens |
| Тестовый backend | локальный `127.0.0.1:3001` | Только dev VM |

## Решение владельца (M2)

- **M2 разрешён** без ожидания подключения выдачи кодов из бота.
- Перед боевым запуском вход будет переиспользован с основного сайта.
- **M1 не закрыт полностью:** настоящий login и baseline тестовой БД остаются пунктами приёмки перед production.

## M1: выполнено

- BFF proxy, upstream Basic Auth, 23+ transport tests, fixture-сессия, verify-code path (без UI бота в M2).

## M1: не выполнено (приёмка перед запуском)

- [ ] Настоящий OAuth/login через провайдера или бота.
- [ ] Production-ready schema bootstrap navigator на пустой PostgreSQL.

## M2: выполнено / в работе

- [x] Главная PROF вместо технического экрана M1.
- [x] Профиль: просмотр/редактирование через `GET/PATCH /api/pro/profile`.
- [x] Партнёры: list, search, invite, accept/reject/cancel, pause/resume, term-change respond.
- [x] Session gate без публичного bot-login; fixture-сессия через local-dev docs.
- [ ] Интеграционные проверки двух участников (зависит от seed/сессий в тестовой БД).

## M2: не включено (M3+ backlog)

- QR/сертификаты, сканер, покупки, начисления, программы, CRM, массовые приглашения.

## Проверки

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | см. последний commit M2 |
| `npm run lint` / `build` | см. последний commit M2 |
| Fixture JWT (не login) | локально через docs |
| Production | не вызывался |
