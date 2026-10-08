# PROF-F — приёмка (fix-pass 2)

## Ветки

| Репозиторий | Feature branch | HEAD (после push) |
|-------------|----------------|-------------------|
| remcard-navigator | `feat/prof-f-profile-catalog-team` | `f4caf30` |
| remcard-partner-platform | `feat/prof-f-profile-catalog-team` | `0765a6b` |

База: navigator `2908914`, platform `8160e24` → продолжение на той же ветке.

## Сделано в этом проходе

### Каталог User / Organization / Branch

- Submit **без** `flushUserCatalogDraftOnDb` до валидации; ошибка submit не переносит draft в live.
- Resubmit: `APPROVED` + `catalogDraft` → submit → `PENDING`, **live колонки и публичная карточка до approve не меняются**; approve атомарно применяет draft (`buildUserApproveUpdate` / org / branch).
- Revise/reject pending resubmit: live public сохраняется (`isPublic` не сбрасывается без необходимости; reject resubmit → `APPROVED` + draft остаётся).
- Org submit через profile / org API **не** массово ставит все филиалы в PENDING; филиал — отдельный `submit-for-moderation`.
- PATCH org/branch: catalog-поля stage в `catalogDraft` при live APPROVED; `unpublishFromCatalog` / `discardCatalogDraft` per entity.
- Overlay draft: явный `null` в draft **не** восстанавливает live через `??`.
- UI: `canSubmit` для `APPROVED` + draft; unpublish **без** `persistProfileDraft`; catalog save — `persistCatalogDraftOnly`; убран `showFullName` из пользовательского текста.

### Сотрудники PROF

- `ProfileTeamEmployeeCard`: карточка, смена роли (PATCH), перевод (POST transfer), отзыв (DELETE); права через `viewer.canManageEmployeesByBranchId` + server API.

## Команды проверки

```bash
# navigator
cd remcard-navigator
pnpm typecheck
pnpm exec vitest run --exclude '**/*.integration.test.ts'
PLATFORM_INN=7707083893 PLATFORM_OGRN=1027700132195 NODE_ENV=production pnpm build

# platform
cd remcard-partner-platform
npm run test
NODE_ENV=production npm run build
```

## Регрессии

| Сценарий | Результат |
|----------|-----------|
| Unit/API (navigator без `*.integration.test.ts`) | **PASS** (после фикса org submit / approve-all mocks) |
| platform `npm run test` + production build | **PASS** |
| PG `remcard_prof_test` lifecycle + migrate deploy | **NOT VERIFIED** — локальный `DATABASE_URL` указывает на другую БД; `prisma migrate deploy` падает на историческом `20260325120000_add_pro_mode` (enum уже exists). Интеграционный тест `catalogPublicationLifecycle.integration.test.ts` включён только при `DATABASE_URL` с `remcard_prof_test`. |
| Browser 1440/390 + staff-invite + parity remcard.ru | **NOT VERIFIED** — полный стек и изолированная `remcard_prof_test` не подняты в этой сессии |
| Real bot E2E | **NOT VERIFIED** |

## Скриншоты

Не снимались (browser smoke не выполнен).

## Остатки исходного объёма

- Явный UI «опубликовано vs черновик» для org/branch в PROF (backend staging есть).
- SOLO `PartnerEmployee` карточка в UI (API `/api/pro/employees/[id]` есть; ветка BRANCH закрыта).
- Полный PG прогон User+Org+Branch на **выделенной** `remcard_prof_test` после чистого migrate baseline.
