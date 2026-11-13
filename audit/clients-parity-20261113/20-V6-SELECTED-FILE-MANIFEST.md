# Author handoff — selected-file manifest @ `78e48521`

**Base for apply:** EXACT `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79`  
**Impl pin:** `78e4852194a0b9d307ee92743ae754dd18d5a9ba` (product fix `5063368a`)  
**Rule:** cherry-pick / copy **only** allowed surface. Do **not** transfer Gate/Context/route/history helper/vitest.config. No substitute API. No fake local persistence.

## INCLUDE (allowed Clients UI / parity surface)

From tip vs base (observer / direction / clients-parity / audit scripts):

- `src/components/clients/observer/**` (incl. final `observer.module.css` with KPI + mobile row cascade)
- `src/components/clients/direction/**`
- `src/components/clients/ClientsListWorkspace.tsx` (prop-forward only; on `57ca4680` use real `OwnerClientsGate` without cast theater)
- `src/lib/clients-parity/**` (fixtures, contracts stubs returning BLOCKED, specs, computed tests, audit JSON)
- `scripts/clients-parity-20261113/**` (harness + measure scripts) — audit/dev only

Author `patch-manifest-57ca4680.json` at tip aligns with this include set.

## EXCLUDE / FORBIDDEN (must match base verbatim)

- `src/components/clients/OwnerClientsGate.tsx`
- `src/components/clients/OwnerClientsModeContext.tsx`
- `src/app/(cabinet)/clients/page.tsx` — do not move; keep `src/app/clients/page.tsx`
- `src/lib/onboarding-step/history-link-eligibility.ts` (+ related history helper files)
- `vitest.config.ts` (do not rewrite production includes for parity)

## Remaining blockers (explicit — do not “unblock”)

| Blocker | Meaning |
|---|---|
| **FORBIDDEN packaging** | Until Gate/Context/route/helper match `57ca4680`, section delivery not accepted |
| **BLK-OBSERVER-REFERRED** | No `/api/pro/referred-appeals*` handlers |
| **BLK-RECEIVING-APPEALS** | No `/api/pro/client-appeals*` / working-stages |
| **BLK-OBSERVER-PERSONAL-PERSIST** | No personal-meta overlay API; disabled Save ≠ persistence PASS; **do not** map to AgentClient archive/delete |
| Full visual/prototype parity | Not claimed by V6 isolated regressions |
| Receiving-side CRM | Incomplete / blocked |

## Forbidden claims

- Fake successful save / localStorage as production store  
- Borrowing Agent CRM deletion/archive as personal trash  
- Inventing referred-appeals / personal-meta APIs  
- DB / rights / formulas / infrastructure / prod deploy changes  
- Whole stale-branch transfer onto production base  

## Unrelated

Computer client-R1 fixes `26cf40bd` (101 tests) — **out of scope** for Clients section acceptance.
