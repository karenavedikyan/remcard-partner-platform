# PROF-H1 — progress (fix-pass)

## Git

| | SHA | Branch |
|---|---|---|
| Base | `bb60c60` | `origin/release/prof-v1-20261007` |
| Prior HEAD | `1f5df46` | `feat/prof-h-profile-redesign` (initial H1) |
| HEAD | _(after fix-pass push)_ | `feat/prof-h-profile-redesign` |

## Fix-pass (приёмка H1)

| # | Тема | Изменение |
|---|---|---|
| 1 | Dirty basics | `profile-draft-sync`: `initial` rerender не затирает форму; смена `user.id` сбрасывает; после save — `applyProfile` |
| 2 | History | `router.push` при смене вкладки; `searchParams` → `activeSection` (Back/Forward/reload) |
| 3 | Обзор | Только сохранённый профиль; баннер несохранённых правок; `master-direction-label` для trade + L1 |
| 4 | Счётчики | SOLO: ошибка `/api/pro/employees` ≠ 0; нет fallback на `organization.branchCount` при 403/ошибке |
| 5 | Тесты | Vitest: `profile-sections`, `profile-draft-sync`, `master-direction-label`, `profile-overview-display`, `ProfileOverviewSection` |
| 6 | Скриншоты | Fixture + `DEV_FIXTURE_EMPLOYEES_OVERVIEW` (5 сотрудников, 3 филиала); 1440/390 |

Backend, API-контракты, permissions, catalog lifecycle **не менялись**.

## Reuse map (кратко)

| Источник | H1 |
|---|---|
| `ProfileEditor` + разделы | Каркас, dirty-sync, push-навигация |
| `profile-draft-sync` | Snapshot сохранённого vs форма |
| `profile-overview-display` | Обзор только из `ProProfileResponse` |
| `employees-overview` + `/api/pro/employees` | Счётчики в scope (fixture на dev-fixture) |

## Проверки (факт)

| Команда | Результат |
|---|---|
| `npm run test:proxy` | PASS (228 tests) |
| `npm run test:component` | PASS (66 tests, incl. `profile-sections.test.ts` ×6) |
| `npm run lint` | PASS (pre-existing `AuthFlow` hook warning) |
| `npx tsc --noEmit` | PASS (after clean `.next`) |
| `NODE_ENV=production npm run build` | PASS (exit 0) |

### Регрессии (component)

- Rerender `initial` + dirty имя → значение сохраняется
- `router.push` на смене вкладки; sync из `searchParams`
- Обзор: org title, MASTER labels, incomplete ≠ «Готов к работе»
- Overview: 403 без branchCount 99; SOLO 500 → retry; manager scoped count

## Browser (fixture UI, не authenticated E2E)

| Файл | Viewport |
|---|---|
| `docs/screenshots/prof-h1-overview-1440.png` | 1440×900 |
| `docs/screenshots/prof-h1-basics-1440.png` | 1440×900 |
| `docs/screenshots/prof-h1-overview-390.png` | 390×844 |

Overflow (390): `documentElement.clientWidth` = 390, визуально без page horizontal scroll; вкладки прокручиваются в полосе.

## NOT VERIFIED

- Real-auth E2E на стенде с backend
- PROF-G bell (не в release base)

## H2

Единые справочники / visibility / PATCH — отдельное задание после приёмки H1.
