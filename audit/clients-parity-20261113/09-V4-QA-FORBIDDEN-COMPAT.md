# V4-QA — forbidden delivery files vs EXACT `57ca4680`

**Named impl candidate:** `4c2e4cdf9ab7c17b6c8864d42ee6b34fcdcf87bd`  
**Author subsequent correction:** `d1da948491293c1a8ba77d4854191347708b4379`  
**productionBaseSha:** `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79`  
**Prior V3 tip (do not treat as this candidate):** `ffd4aa6130e92af5d95da21cfe5519133228a962`  
**Computer decision:** delivery **not accepted** while Gate / Context / route / history helper / vitest.config diverge from exact production packaging.

## Forbidden deltas (both `4c2e4cdf` and `d1da9484`)

| File | Base `57ca4680` | Candidate tip | Verdict |
|---|---|---|---|
| `src/components/clients/OwnerClientsGate.tsx` | `useCabinetPresentation` + `useBusinessSectionDispatch`; accepts `canLinkOnboardingHistory?` | Manual R03/R06 + `/api/auth/me` + `/api/pro/context`; **signature is `{ children }` only** | **FORBIDDEN_DELTA** |
| `src/components/clients/OwnerClientsModeContext.tsx` | Exposes `canLinkOnboardingHistory` + `useOwnerClientsCanLinkOnboardingHistory` | Field + hook **removed** | **FORBIDDEN_DELTA** |
| `src/app/clients/page.tsx` | Exact route; passes `canLinkOnboardingHistory={canLinkOnboardingHistoryFromUserRole(...)}` | Moved to `src/app/(cabinet)/clients/page.tsx`; **omits** `canLinkOnboardingHistory` prop | **FORBIDDEN_ROUTE_MOVE** |
| `src/lib/onboarding-step/history-link-eligibility.ts` (+ related) | Present | **Deleted** (entire `onboarding-step/` helper set) | **FORBIDDEN_HELPER_TOUCH** |
| `vitest.config.ts` | Base include set | Rewritten includes (+ clients-parity) | **FORBIDDEN_CONFIG** |

`git diff --stat 57ca4680 d1da9484` on the above paths remains non-empty. Correction `d1da9484` does **not** restore EXACT packaging.

## Prop-forwarding check (required)

| Step | `57ca4680` | `4c2e4cdf` | `d1da9484` |
|---|---|---|---|
| Route → Workspace | passes `canLinkOnboardingHistory` | `(cabinet)/clients/page.tsx` → `<ClientsListWorkspace />` **no prop** | same — **no prop** |
| Workspace → Gate | `<OwnerClientsGate canLinkOnboardingHistory={…}>` | `void canLinkOnboardingHistory` — **discards** | JSX `<Gate canLinkOnboardingHistory={…}>` via cast |
| Gate accepts prop | yes | Gate signature ignores prop | Gate signature **still** `{ children }` only — cast is theater |
| Context stores prop | yes | stripped | still stripped |

**Verdict:** `d1da9484` removes the `void canLink…` anti-pattern and type-casts a forward, but production-compatible wiring is **not** restored while Gate/Context/route/helper remain rewritten/deleted.

## Allowed surface note

Observer/direction/`clients-parity` UI may change, but only when composed with **byte-compatible** `57ca4680` Gate/Context/route/history helper. Current tips fail that gate regardless of MotionStat / form UX fixes.
