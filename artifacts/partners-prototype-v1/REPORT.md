# Отчёт: RemCard — раздел «Партнёры» (prototype-v1)

**Область:** Партнёры (не админка).  
**Live-выпуск:** не утверждается.

## Branches / SHA

| Repo | Branch | SHA | Примечание |
| --- | --- | --- | --- |
| remcard-partner-platform | `feat/partners-prototype-v1-20261029` | *(см. tip после push)* | base `1d9bbeb6332b68ba4421a299c1b6b5e3dfe8dd1e` |
| remcard-navigator | — | — | **нет доступа** (404); backend task branch не создавалась |

Reference snapshot `4ba2f9e…` / `docs/prototype-reference/current/partner/*` — не прочитаны.

## Changed files (основные)

- `src/lib/partners-prototype-v1/**` — adapters, wizard state, repair-path, published terms, tests
- `src/components/partners/prototype-v1/**` — FindVitrine, RepairPathNav, InviteWizard
- `src/components/partners/AgentR04ListToolbar.tsx` — компактная строка
- `src/components/partners/AgentPartnerDiscoveryFilters.tsx` — specialization в list-extra
- `src/components/partners/PartnersHub.tsx` — wiring vitrine + wizard (agent-r04)
- `vitest.config.ts` — include owned tests
- `scripts/partners-prototype-v1-visual-*`
- `artifacts/partners-prototype-v1/**` — FLOWS, matrix, SHARED-CHANGE-REQUEST, BLOCKERS, screenshots (LOCAL FIXTURE)

## Coverage

См. `COVERAGE-MATRIX.md`. Кратко: toolbar/wizard/repair-path helpers — зелёные тесты; facets/published percents/exact redesign CSS — blockers.

## Verification

| Check | Result |
| --- | --- |
| vitest targeted (37) | pass |
| `tsc --noEmit` | 0 |
| `npm run build` | 0 |
| Playwright LOCAL FIXTURE 375/1440 × light/dark | 12 PNG → `screenshots/` |
| Real invite POST against production | **не выполнялся** (`disableSubmit` в QA) |

## Shared-change requests / blockers

- `SHARED-CHANGE-REQUEST.md` — facets + optional publishedTerms + vitest include
- `BLOCKERS.md` — navigator access, facets, type-unify not merged

## Не реализовано / честно

- Pixel/copy parity с `partners-redesign.js/css` без reference
- Full-set stage counters на live API без facets
- Backend partnership routes (нет repo)
- Merge type-unify / staff invites / global nav — вне ownership
