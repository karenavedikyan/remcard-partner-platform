# STORE-COMPANY-HOME-ADAPT-02

## Runtime refs (not released)

| Role | Exact SHA |
|------|-----------|
| Frontend base / product branch root | `be43ffc8a34088392635fb9e9079b5929369c117` |
| Backend base (unchanged unless noted) | `5a2c2a7d9d5c03f2b948626dea2a987daa0422a4` |
| Remote branch | `feat/store-company-home-adapt-02` (partner-platform + remcard-navigator) |

Production deploy, merge to `main`, and release ref updates were **not** performed.

## Product

Adapted Home88 store/company owner dashboard onto current cabinet routing:

- Shared shell with specialist home gate unchanged; **business owner** (`resolveCabinetNavMode` → `business-store` / `business-company`) gets `BusinessOwnerHomeDashboard`.
- Copy/CTAs per prototype: scanner (store), team invite (company), «С чего начать» / «Ничего лишнего на старте» blocks.
- Readiness / `NEEDS_REVISION` banners preserved.

## Metrics map

| UI label | STORE source | COMPANY source | Scope / limits |
|----------|--------------|----------------|----------------|
| Продажи сегодня | `Order.count` MSK day, store access + **active branch** certificate scope | — | Not org-wide; needs selected branch |
| Партнёры | `Partnership.count` ACTIVE for owner store user | same (tertiary) | Owner partnerships only |
| Мои операции | `Order.count` MSK day, actor `storeUserId = owner` | — | **Not** a full ops journal; distinct from sales filter |
| Филиалы | — | active `Branch.count` | |
| Сотрудники | — | branch employees + org members, deduped, excl. owner | No pending invites |

Server: `GET /api/pro/business-home/metrics` — `getProfCabinetUser`, `getProContextForRequest`, **403** unless `ORG_OWNER` with organization. No client-supplied org/branch ids.

## Reuse

- `SpecialistHomeDashboard.module.css` styling
- `resolveCabinetNavMode` / specialist gate pattern
- Ported delta from `a8a39e02` (UI) + `e5f82753` (API), not whole old branches

## Verified (this branch)

- `vitest`: `business-home/gate`, `BusinessOwnerHomeDashboard.presentation`, navigator `businessHomeMskPeriod` + route tests
- `tsc --noEmit`, `npm run build` (partner-platform)

## Open / honest limits

- «Мои операции» = actor-attributed orders today (MSK), not all staff operations.
- Full-shell browser captures with live metrics require isolated backend fixtures (not run in this artifact set unless `metadata.json` present).
