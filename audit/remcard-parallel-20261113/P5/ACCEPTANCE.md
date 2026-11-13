# П5 — Личные и массовые действия

## Прогон

| Поле | Значение |
| --- | --- |
| Base (candidate) | `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0` |
| Branch | `cursor/remcard-p5-acceptance-20261113` |
| Commit | _(заполняется после push)_ |

## Изменённые файлы (write allowlist + отчёт + тесты)

- `src/components/clients/observer/ObserverPersonalConfirmPanel.tsx` — честная подсказка BLOCKED_PERSISTENCE, `title` на подтверждении
- `src/components/clients/observer/P5.ObserverPersonalTools.test.tsx`
- `src/components/clients/observer/P5.ObserverPersonalEditPanel.test.tsx`
- `src/components/clients/observer/P5.ObserverPersonalConfirmPanel.test.tsx`
- `src/components/clients/observer/P5.ObserverPersonalClientRow.test.tsx`
- `audit/remcard-parallel-20261113/P5/fixtures.ts`
- `audit/remcard-parallel-20261113/P5/ACCEPTANCE.md`

Без изменений (верифицировано тестами): `ObserverPersonalTools.tsx`, `ObserverPersonalEditPanel.tsx`, `ObserverPersonalClientRow.tsx`.

## Тесты (фактический запуск)

```text
npm run test:component -- src/components/clients/observer/P5.
→ 4 files, 18 tests PASS

npm run test:component -- src/components/clients/observer/ObserverPartnersListView.test.tsx
→ 7 tests PASS (read-only интеграция: cancel draft, BLOCKED archive, disabled save)
```

## Требования (owned UI)

| ID | Требование | Статус | Примечание |
| --- | --- | --- | --- |
| P5-SEL | Выбор one/many/all, сброс, mixed `aria-checked` | **PASS** | `P5.ObserverPersonalTools`, row checkbox |
| P5-EDIT | Редактирование single/bulk, отмена, сброс черновика при `initial` | **PASS** | save `disabled` + `BLOCKED_PERSISTENCE` |
| P5-ARCH | Семантика архив / «удалить у себя» / восстановление по bucket | **PASS** | trash скрывает edit+delete |
| P5-CONF | Панели подтверждения archive/trash/restore | **PASS** | confirm → родитель даёт notice; без мутации |
| C35 | Save personal fields | **IN_PROGRESS** | UI only — persistence **BLOCKED** |
| C36 | Bulk tag | **IN_PROGRESS** | UI only — persistence **BLOCKED** |
| C37 | Archive/trash/restore persistence | **IN_PROGRESS** | UI + notice — persistence **BLOCKED** |
| C38 | Personal overlay API | **BLOCKED** | нет контракта personal-meta |
| P5-E2E | Browser с перехватом | **BLOCKED** | synthetic component tests only |

## Остаток и зависимости

- **Серверный personal-meta overlay** (`BLK-OBSERVER-PERSONAL-PERSIST`): владелец API/контракта вне П5; save и реальный archive/trash остаются заблокированы.
- **Referrred appeals dataset** (`BLK-OBSERVER-REFERRED`): `ObserverPartnersListView` / fetch — read-only для П5.
- **Стили списка** (`observer.module.css`): владелец П7.
- **Vitest include**: новые `P5.*` тесты запускаются явным путём; добавление в `vitest.config.ts` — вне зоны П5 (READ-ONLY).

## Целостность раздела

Полная приёмка раздела «Мои клиенты у партнёров» **не заявляется**: persistence личных полей и bucket-перемещений по-прежнему **BLOCKED** на уровне продукта.
