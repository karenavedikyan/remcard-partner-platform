# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M2-fix завершён).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | `460cb5a` на ветке `cursor/m2-prof-partners-b3e3` (Draft PR #2, base M1) | M2-fix |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only, без изменений |
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
| `npm run lint` | ok |
| `env -u NODE_ENV npm run build` | ok (нестандартный NODE_ENV в VM ломает prerender) |
| Fixture integration (curl) | search, accept_pending (staff blocked / store ok), term-change |
| UI screenshots | `m2fix-invite-dialog`, `m2fix-pending-store-side`, `m2fix-partners-search-dropdown`, `m2fix-term-change-dialog`, `m2fix-partners-mobile` |

## Ограничения визуальной приёмки

- Скриншот PENDING со стороны staff (автор предложения) не получен в автоматическом браузере из‑за нестабильной установки cookie; поведение подтверждено unit-тестами и curl (`accept_pending` → 400 для автора).
- Сценарий «отказ постороннему» в UI не снимался; API возвращает 403/401 для чужих сессий.
