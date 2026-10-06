# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M2: блокировка неизвестного org-type + проверка постороннего PRO).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m2-prof-partners-b3e3` (Draft PR #2, base M1) | M2 закрыт |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only, без изменений |
| Прототип | https://pro.remcard.ru/ | Design tokens |

## M2: последние исправления

- [x] Неизвестный тип организации: `inviteTargetStoreOwnershipUnknown()` блокирует приглашение, если у цели есть `organizationName`, но `isStoreOwner` не подтверждён; сообщение «Не удалось определить условия партнёра…»; проверка в submit(); general/10% не показывается при блокировке.
- [x] Однозначные сценарии сохранены: store-приглашающий, STORE target, подтверждённый non-STORE org, мастер без организации.
- [x] Посторонний PRO (`m1fix-prof`): GET/POST/respond term-change чужого партнёрства → 404, проценты не меняются; участники A/B — действия разрешены.

## Пробел API (документирован)

`GET /api/partnership/search` не возвращает `organizationPartnerType`. При наличии `organizationName` без типа приглашение блокируется, чтобы не угадать trade-side. После появления поля в API блокировка снимется автоматически.

## Приёмка перед запуском (не закрыто)

- [ ] Настоящий login (бот/OAuth отложен владельцем).
- [ ] Navigator baseline на пустой PostgreSQL.
- [ ] Counter-offer при первичном приглашении (есть в navigator, не в UI M2).

## Проверки

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | 47/47 |
| `npm run lint` | ok |
| `env -u NODE_ENV npm run build` | ok |
| Outsider PRO term-change GET | 404 «Партнёрство не найдено» |
| Outsider PRO term-change POST | 404 |
| Outsider PRO respond approve/reject | 404, percent остаётся 12% |
| Participant B approve pending | 200 APPROVED, percent → 13% |
