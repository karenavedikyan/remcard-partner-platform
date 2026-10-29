# RemCard — кабинет администратора, РЕЛИЗ 1

**Статус: HARD BLOCKED — нет эталона и нет backend repo. Код R1 не начат (контракт запрещает mock/приблизительный UI).**

Время фиксации: 2026-10-29T14:39:53Z. Live-выпуск не утверждается.

## Задача

Админка R1 по `reference/current/admin/` (DEMO.releases id=1) в рабочем PROF на task-ветках.

## Branches + SHA

| Repo | Branch | SHA | Доступ |
|------|--------|-----|--------|
| remcard-partner-platform (frontend) | `feat/admin-release1-prototype-20261029` | `1d9bbeb6332b68ba4421a299c1b6b5e3dfe8dd1e` (= base `release/prof-v1-20261007`) | OK |
| remcard-navigator (backend) | ожидался `release/prof-backend-v1-20261007` = `4b4c1244…` / task `feat/admin-release1-prototype-20261029` | — | **НЕТ** (`gh`/`git` → Repository not found, HTTP 404) |
| Reference worktree | `reference/prototype-20261029` @ `4ba2f9e764b412e956e2ccb619ebbcab7d76a006` | — | **НЕТ** (лежит в navigator) |
| Публичный эталон | https://lkdemo.pplx.app | — | **404 App not found** |

Environment repos: только `github.com/karenavedikyan/remcard-partner-platform`.

Запрос координатору/владельцу: `cursor-cloud/request-environment-setup-actions` — `navigator-repo-access`, `lkdemo-or-reference-pack`.

## Changed files (этот проход)

Только артефакты blockers/baseline (нет UI/API кода):

- `artifacts/admin-r1-20261029/REPORT.md`
- `artifacts/admin-r1-20261029/FLOWS.md`
- `artifacts/admin-r1-20261029/COVERAGE-MATRIX.md`
- `artifacts/admin-r1-20261029/BASELINE-EXISTING-ADMIN.md`
- `SHARED-CHANGE-REQUEST.md` (заготовки; shared patch не коммитился)

## Dependency: единый тип партнёра

Чужая ветка `feat/partner-primary-kind-unify-20261029` (frontend tip seen `a140bc8c…`, backend `af8959ee…`) **не merge / не cherry-pick**. Admin R1 будет читать `partnerKind` из registry DTO / adapter поверх `resolvePartnerKindUi`, без локального `includes("AGENT")` classifier. Пока не принята Computer — риск рассинхрона фильтров/facet по 4 типам.

## Что уже есть в PROF (не R1-перенос)

Существующий `/admin/*` (overview, partners registry+partnerships, moderation profiles, notifications, test-users, password) на BFF `/api/pro/admin/**`. Это baseline, не visual parity с эталоном R1. Подробности: `BASELINE-EXISTING-ADMIN.md`.

## Не реализовано / blockers

1. **Нет read-доступа к remcard-navigator** → нет reference HTML/CSS/JS, нет backend task-ветки, нет точных API contracts для clients/certs/deals/analytics/team/journal/reviews.
2. **lkdemo.pplx.app 404** → нельзя снять visual baseline.
3. Без эталона **запрещено** приблизительное dashboard/template; без API **запрещены** mock-данные и fullstack-готовность.
4. В BFF allowlist (`src/lib/remcard-proxy.ts`) **нет** маршрутов: partner card detail (кроме partnerships/lifecycle), reviews moderation actions, clients/certs/deals lists, team/StaffRole CRUD, audit journal, RemScore analytics beyond management overview. Любые additions → `SHARED-CHANGE-REQUEST.md` + backend в admin области.

## Tests / build / screenshots

Не запускались для R1 (нет изменений кода продукта). После разблокировки: `npm ci --include=dev`, targeted vitest/playwright, `tsc --noEmit`, `npm run build`; screenshots LOCAL FIXTURE / harness.

## Next (после доступа)

1. Read-only worktree `reference/prototype-20261029` @ `4ba2f9e…`, прочитать весь `docs/prototype-reference/current/admin/` + gating R1 в `app.js`/`data.js`.
2. Обновить FLOWS.md и coverage matrix «прототип → компонент → API → проверка».
3. Реализовать `src/components/admin-r1/**`, `src/lib/admin-r1/**`, расширить `src/app/admin/**` без shared edits; backend `feat/admin-release1-prototype-20261029` только `/api/pro/admin/**` + `adminR1*` helpers.
4. Не активировать R2/R3; без кураторов/задач/миграций/production writes.
