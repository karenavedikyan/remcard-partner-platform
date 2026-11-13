# Selected-file manifest (V8 refresh)

**Base for apply:** EXACT `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79`  
**Current productFixSha:** `140de0a83044f324bf455ac2dfb87b17432fb8d1`  
**Author tip:** `a36c609b7ea7a43ce4f4ec544f7ad0e60b403447`  
**Historical V6 fix (stale if used as current):** `5063368aea4a4219df354b0fcad7a0eaf9846ac8`  
**Rule:** cherry-pick / copy **only** allowed surface. Do **not** transfer Gate/Context/route/history helper/vitest.config. No substitute API. No fake local persistence. **No whole-branch transfer.**

## INCLUDE (allowed Clients UI / parity surface)

- `src/components/clients/observer/**` (incl. final `observer.module.css` with KPI + max1100/max760 row cascade)
- `src/components/clients/direction/**`
- `src/components/clients/ClientsListWorkspace.tsx` (prop-forward only; on `57ca4680` use real `OwnerClientsGate` without cast theater)
- `src/lib/clients-parity/**` (fixtures, contracts stubs returning BLOCKED, specs, computed tests, audit JSON)
- `scripts/clients-parity-20261113/**` (harness + measure scripts) — audit/dev only

## EXCLUDE / FORBIDDEN (must match base verbatim)

- `src/components/clients/OwnerClientsGate.tsx`
- `src/components/clients/OwnerClientsModeContext.tsx`
- `src/app/(cabinet)/clients/page.tsx` — do not move; keep `src/app/clients/page.tsx`
- `src/lib/onboarding-step/history-link-eligibility.ts` (+ related history helper files)
- `vitest.config.ts` (do not rewrite production includes for parity)

## Auditor verification @ tip `a36c609b`

All EXCLUDE paths still **diverge** from `57ca4680` on the author tip (deltas/deletes/route move). Manifest policy is correct; tip packaging remains FAIL until selected-file apply leaves those surfaces untouched.

## Author metadata defect

`src/lib/clients-parity/patch-manifest-57ca4680.json` still lists stale `productFixSha=5063368…`. Correct value is `140de0a8…`. See `v8-corrected-patch-manifest-57ca4680.json`.

## Remaining blockers (explicit — do not “unblock”)

| Blocker | Meaning |
|---|---|
| **FORBIDDEN packaging** | Until Gate/Context/route/helper/vitest match `57ca4680`, section delivery not accepted |
| **BLK-RECEIVING-APPEALS** | No `/api/pro/client-appeals*` / working-stages on BE |
| **BLK-OBSERVER-REFERRED** | No `/api/pro/referred-appeals*` on BE |
| **BLK-OBSERVER-PERSONAL-PERSIST** | No personal-meta overlay API; disabled Save ≠ persistence PASS; **do not** map to AgentClient archive/delete |
| Full visual/prototype parity | Not claimed by isolated Computer regressions |
| Receiving-side CRM | Incomplete / blocked |

## Forbidden claims

- Fake successful save / localStorage as production store  
- Borrowing Agent CRM deletion/archive as personal trash  
- Inventing referred-appeals / personal-meta APIs  
- DB / rights / formulas / infrastructure / prod deploy changes  
- Whole stale-branch transfer onto production base  
