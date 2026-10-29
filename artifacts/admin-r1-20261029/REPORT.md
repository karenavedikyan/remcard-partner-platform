# RemCard — кабинет администратора, РЕЛИЗ 1

**Статус: implementation on task branches (не live-выпуск).**  
Время: 2026-10-29. Visual signoff без полного browser QA на авторизованном PROF не утверждается.

## Доступы (setup)

| Ресурс | Статус |
|--------|--------|
| Backend remcard-navigator PRIMARY | OK @ `4b4c1244…` base; task branch ниже |
| Reference `reference/prototype-20261029` | OK exact `4ba2f9e764b412e956e2ccb619ebbcab7d76a006` (read-only worktree) |
| Frontend remcard-partner-platform | OK public clone; task branch ниже |
| lkdemo.pplx.app | 404 — не блокер; использован локальный эталон |

## Branches + SHA

| Repo | Branch | SHA |
|------|--------|-----|
| remcard-navigator (backend) | `feat/admin-release1-prototype-20261029` | _(после commit — см. git log)_ |
| remcard-partner-platform (frontend) | `feat/admin-release1-prototype-20261029` | _(после commit/bundle)_ |
| Reference (read-only) | `reference/prototype-20261029` | `4ba2f9e764b412e956e2ccb619ebbcab7d76a006` |
| Type dependency (не merge) | `feat/partner-primary-kind-unify-20261029` | fe `a140bc8c…` / be `af8959ee…` |

## Changed (backend)

- `src/lib/adminR1*.ts` helpers (clients/deals/journal/partner card/remscore/results/auth)
- `/api/pro/admin/{clients,deals,journal,team,certificates,analytics,results/*,partners/:id/card,moderation/reviews*}`
- Tests: `adminR1Routes.permissions.test.ts`, `adminR1Deals.definition.test.ts`
- Artifacts: coverage matrix, FLOWS, REPORT

## Changed (frontend)

- `src/components/admin-r1/**` shell + CSS + nav tests
- `src/lib/admin-r1/**` adapters
- Pages: clients, team, analytics, results, settings, partners/[id] card, moderation/reviews
- `src/app/admin/layout.tsx` → AdminR1Shell
- Registry links → card
- **Separate commit:** `src/lib/remcard-proxy.ts` + tests (BFF allowlist Admin R1 exact routes)
- LOCAL FIXTURE screenshots under `artifacts/admin-r1-20261029/screenshots/`

## Tests / build

### Backend
- `vitest` adminR1 permission + deals contract: PASS
- `tsc --noEmit`: **pre-existing** errors in unrelated tests (~80 lines); **0** in admin R1 paths
- No Prisma/migrations

### Frontend
- `tsc --noEmit`: PASS
- `vitest` AdminR1Nav + AdminShellIsolation: PASS
- `tsx --test remcard-proxy.test.ts` (full proxy suite): PASS (295)
- `npm run build`: PASS (admin routes present)

## Screenshots

LOCAL FIXTURE only: `shell-overview-{1440,375}-{light,dark}.png` (+ meta.json). Not live PROF.

## Shared-change requests

- BFF allowlist: **реализован** в отдельном frontend commit (координатор разрешил exact admin R1 patterns).
- Partner primary kind: dependency only; adapter labels; no shared classifier edit.
- Global CSS/providers/Prisma: не запрошены.

## Не реализовано / blockers

1. Полный visual signoff vs эталон на каждом экране без staff browser QA.
2. Client stages прототипа отсутствуют в модели.
3. Certificate period filter server-side incomplete.
4. RemScore in-memory kind filter limit 500.
5. Type-unify не принят Computer — риск facet labels до merge.
6. Frontend push может требовать bundle (см. artifacts).

## Запреты соблюдены

Нет deploy/merge release/main, миграций, production writes, send notifications, partnership mutations Седа/ОПТОВИК.
