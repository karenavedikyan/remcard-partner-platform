# PROF-H1 — progress

## Git

| | SHA | Branch |
|---|---|---|
| Base | `bb60c60` | `origin/release/prof-v1-20261007` |
| HEAD | `f11b56e` | `feat/prof-h-profile-redesign` |

PROF-G не в базе release (`6f660db` остаётся в `feat/prof-g-notification-center`). Точки интеграции H6: bell в `CabinetShell`, deep link `section=notifications`, без изменений в H1.

## Reuse map (H1)

| Источник | Использование в H1 |
|---|---|
| `ProfileEditor` + формы разделов | Сохранены; обёрнуты горизонтальными вкладками и URL-sync |
| `profile-working-save`, `ProfileDraft` | Обзор: статус «Готов к работе», карточка рабочего профиля |
| `profile-catalog-state`, `catalogPublication` | Обзор: статус каталога, CTA «Подготовить публикацию» / «Управлять карточкой» |
| `ProfileCatalogSection`, branches, team, notifications | Без изменения контрактов save/submit |
| `GET /api/pro/organization/employees-overview` | Сводные счётчики филиалов/сотрудников в scope (без N+1) |
| `onboarding-stages`, `category-display` | Подписи направлений на обзоре |
| `sanitizeReturnTo`, `resolveProfileSectionFromQuery` | Deep links: `section`, `moderation`, `branchId`, `returnTo` |

## Изменения

- `/profile` без query → раздел **Обзор** (`overview`).
- Горизонтальная навигация: Обзор / Основные данные / Каталог RemCard / Филиалы / Сотрудники / Уведомления.
- Новый `ProfileOverviewSection` (композиция по эталону, данные из DTO/loaders).
- `profile/page.tsx`: `moderation=1`, `branchId`, `overview` в resolver.
- Изолированные CSS modules (`ProfileOverviewSection.module.css`, вкладки в `ProfileEditor.module.css`).
- Dev-only fixture: `/profile/dev-fixture` (404 в production build).

## Проверки

| Команда | Результат |
|---|---|
| `npm run test` | PASS (proxy 228 + component 47) |
| `npm run lint` | PASS (1 pre-existing warning in `AuthFlow.tsx`) |
| `npx tsc --noEmit` | PASS после `rm -rf .next` |
| `NODE_ENV=production npm run build` | PASS (exit 0) |

### Сценарии (component / fixture)

| Сценарий | Статус |
|---|---|
| `/profile` без query → обзор | PASS (`ProfileEditor.test.tsx`) |
| URL sync / section switch | PASS |
| Несохранённый ввод basics сохраняется | PASS |
| Deep link `section=catalog`, `section=moderation` | PASS |
| Catalog submit regression | PASS |
| Real-auth E2E 1440/390 | NOT VERIFIED (fixture UI) |

## Скриншоты (fixture UI)

- Desktop 1440: `docs/screenshots/prof-h1-overview-1440.png`
- Desktop 1440 basics: `docs/screenshots/prof-h1-basics-1440.png`
- Mobile 390: `docs/screenshots/prof-h1-overview-390.png`

## NOT VERIFIED

- Real-auth browser E2E на стенде с backend.
- PROF-G bell в базе (ветка не в release); регресс bell — после merge G.

## H2 dependencies

- Единые справочники категорий/этапов, PATCH visibility, поиск — без изменений backend в H1.
