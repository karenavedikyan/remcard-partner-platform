# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M2-fix: партнёрства и условия).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m2-prof-partners-b3e3` (PR #2, base M1) | M2-fix в работе |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only |
| Прототип | https://pro.remcard.ru/ | Design tokens |

## M2-fix: исправлено

- [x] Приглашение: явные условия по категориям trade-side (без slice/скрытых 10%).
- [x] Fallback «general» 10% только с явным подтверждением пользователя.
- [x] Поиск: семантика `role=store|pro` как в navigator, подписи и placeholder по имени.
- [x] PENDING/INVITED: действия и «Требует внимания» по `pendingProposedBy`.
- [x] Term-change: создание запроса POST + ответ + обработка ошибок загрузки.
- [x] Unit-тесты `partnership-rules` (35 tests total с proxy).

## Приёмка перед запуском (не закрыто)

- [ ] Настоящий login (бот/OAuth отложен владельцем).
- [ ] Navigator baseline на пустой PostgreSQL.
- [ ] Counter-offer при первичном приглашении (есть в navigator, не в UI M2).

## Проверки

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | 35/35 |
| Fixture integration (curl) | accept_pending, term-change POST |
| UI screenshots | см. артефакты m2fix-* |
