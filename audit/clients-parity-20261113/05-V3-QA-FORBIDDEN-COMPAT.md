# V3-QA — forbidden delivery files vs EXACT `57ca4680`

**implCandidateSha (registry tip):** `ffd4aa6130e92af5d95da21cfe5519133228a962`  
**intermediateSha:** `87c5ef621ba3405c81a529bdb5feec04bdc7e2b2`  
**productionBaseSha:** `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79`  
**Computer decision:** delivery **not accepted** while these files differ from exact production Gate/Context/route/helper (+ vitest.config churn).

## Forbidden (must match EXACT base — do not change in Clients delivery)

| File | Base `57ca4680` | `87c5ef62` / `ffd4aa61` | Verdict |
|---|---|---|---|
| `src/components/clients/OwnerClientsGate.tsx` | `useCabinetPresentation` + `useBusinessSectionDispatch` | Replaced with manual `fetchAgentR03Status` / `fetchSpecialistR06Status` / `/api/auth/me` + `/api/pro/context` | **FORBIDDEN_DELTA / FAIL** |
| `src/components/clients/OwnerClientsModeContext.tsx` | Production context as at base | Modified | **FORBIDDEN_DELTA / FAIL** |
| `src/app/clients/page.tsx` | Exact route path | Renamed/moved to `src/app/(cabinet)/clients/page.tsx` (R100) | **FORBIDDEN_ROUTE_MOVE / FAIL** |
| `src/lib/onboarding-step/history-link-eligibility.ts` | Exact helper (+ JSDoc) | Comment-only deletions (behavior same) but **file still changed** | **FORBIDDEN_HELPER_TOUCH / FAIL** |
| `vitest.config.ts` | Base include set | Adds clients-parity tests; removes many unrelated includes | **FORBIDDEN_CONFIG / FAIL** |

`git merge-base --is-ancestor 57ca4680 ffd4aa61` → **false** (merge-base `bbf06ef8`).

## Allowed surface (may change) — must still compose with EXACT Gate

Allowed examples present on tip:

- `src/components/clients/observer/**`
- `src/components/clients/direction/**`
- `src/lib/clients-parity/**`
- `ClientsListWorkspace.tsx` body swap to `ClientsDirectionWorkspace` **only if** it keeps Gate/Context/page/helper untouched and prop-forwards `canLinkOnboardingHistory` exactly as base.

Current tip **fails** the composition gate because forbidden files are already rewritten. Author V3 followup: rebase/cherry-pick **only allowed files** onto `57ca4680` without Gate/Context/route/helper/vitest.config edits.

## Compatibility check of allowed UI vs EXACT Gate (static)

Base Gate already:

1. Accepts `canLinkOnboardingHistory?: boolean`
2. Provides `OwnerClientsModeProvider` children when eligible
3. Uses business section dispatch for loading/error/decision

Allowed observer/direction components consume `useOwnerClientsMode()` / accessMode props — they do **not** require the rewritten Gate. Therefore a clean delivery is: **keep base Gate/Context/route/helper byte-compatible**, wire `ClientsListWorkspace` children to direction/observer only.
