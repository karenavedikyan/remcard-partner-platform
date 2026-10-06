# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M2-fix-2 завершён).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m2-prof-partners-b3e3` (Draft PR #2, base M1) | M2-fix-2 |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only, без изменений |
| Прототип | https://pro.remcard.ru/ | Design tokens |

## M2-fix-2: исправлено

- [x] `PartnerInviteDialog`: стабильная инициализация формы через `resetKey` + reducer (`invite-form-state.ts`); ввод не сбрасывается при re-render родителя.
- [x] Определение магазина: убрана эвристика `Boolean(organizationName)`; `searchResultToPartnerSide()` использует только `partnerType` и подтверждённый `organizationPartnerType`.
- [x] Полный UI-сценарий term-change (approve + reject) на fixture `m2fix2-*`.
- [x] +10 regression-тестов (`invite-form-state`, store-side rules).

## Известный пробел API (не блокер M2-fix-2)

`GET /api/partnership/search` не возвращает `organizationPartnerType`. UI опирается на `partnerType=STORE` или явное поле `organizationPartnerType` (если появится). Случай «владелец STORE-организации с `partnerType=COMPANY`» без дополнительного API не различается — сервер при POST invite проверит категории.

## Приёмка перед запуском (не закрыто)

- [ ] Настоящий login (бот/OAuth отложен владельцем).
- [ ] Navigator baseline на пустой PostgreSQL.
- [ ] Counter-offer при первичном приглашении (есть в navigator, не в UI M2).

## Проверки

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | 45/45 |
| `npm run lint` | ok |
| `env -u NODE_ENV npm run build` | ok |
| Term-change curl (m2fix2 fixture) | POST 12% → approve → 12%; POST 14% → reject → 12% |
| Term-change UI (2 сессии) | 5/5 шагов PASS |
| Invite form UI (17% + comment) | PASS |

## Скриншоты M2-fix-2

- `m2fix2-invite-edited.webp` — приглашение с 17% и комментарием
- `m2fix2-term-waiting-a.webp` — ожидание ответа у инициатора
- `m2fix2-term-approve-b.webp` — согласование у второй стороны
- `m2fix2-term-updated-12.webp` — 12% после approve
- `m2fix2-term-rejected-14.webp` — отклонение 14%, остаётся 12%
