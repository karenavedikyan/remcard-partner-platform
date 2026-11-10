# Wallet branch-merge QA (runtime loader under test)

**Runtime under test:** merge `origin/release/fe-wallet-multi-branch-settlements-edb2c187` (≥ `40db71d3`, coverage note on QA branch successor).  
**QA branch:** `qa/wallet-multi-branch-harness-ca9358f3`  
**Harness:** `scripts/settlements-visual-qa/` — mocks **`@/lib/api-client` `remcardFetch` only**; **`src/lib/settlements-loader.ts`** and **`settlements-merge.ts`** are real.

## Commands

```bash
git checkout qa/wallet-multi-branch-harness-ca9358f3

pnpm exec vitest run src/lib/business-wallet/settlements-branch-fetch.test.ts

pnpm run harness:settlements-qa
```

| Scene | Expected `window.__QA_SETTLEMENTS_FETCH_LOG__` |
|--------|-----------------------------------------------|
| `?scene=company-owner` | **1×** `/api/pro/wallet/settlements` (no `branchId`) |
| `?scene=company-staff-6` | **6×** `...settlements?branchId=branch-b1` … `branch-b6` (sorted parallel); merged UI shows staff `coverageNote` with branch list + unassigned caveat |
| `?scene=company-staff-1` | **1×** `?branchId=branch-b1` |
| `?scene=company-staff-403` | **6×** attempts; `branch-b4` returns 403 **only in this scene**; UI error; **no** partial merged success |

Inspect log in DOM: `data-testid="qa-settlements-fetch-log"`.

## Branch ids (synthetic)

**Six retail branches only:** `branch-b1` … `branch-b6`.  
**HO is not** a backend wallet `branchId` — wallet grants use **branchAssignments** on store branches only (HO excluded; align with navigator wallet auditor).

## Owner vs staff honesty

Owner mock includes `owner-null-branch` row (historical / no branch). Staff merged view **omits** it by design — UI must not imply full company parity. Runtime staff merge adds `coverageNote` clarifying scoped branches and excluded unassigned historical accruals.

## Caveat

Per-branch staff merge ≠ owner aggregate for null-branch orders. Do not claim full owner parity in QA sign-off.
