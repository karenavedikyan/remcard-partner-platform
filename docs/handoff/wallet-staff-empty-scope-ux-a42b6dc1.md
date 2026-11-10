# Read-only diagnosis: staff merged wallet empty hides scope `coverageNote`

**Runtime SHA:** `a42b6dc1776c7cbc64eae063d8602be41edda883`  
**Branch:** `release/fe-wallet-multi-branch-settlements-edb2c187`  
**Live check (Comet / Сергей, ОПТОВИК):** 6× `GET ?branchId=` → **HTTP 200**, `receivable/payable/completed = []`; UI **«ПОКА ПУСТО»** (`WalletSectionEmptyState`), **no** staff scope caveat, **no** partner rows / totals.

**Not in scope for this note:** SQL/DB, impersonation, grants changes, deploy, null-branch as *proven* cause of missing rows (historical unassigned accruals are a *possible* backend/data explanation only).

---

## What works on `a42b6dc1`

| Layer | Status |
|--------|--------|
| FE branch union | Executes (6 parallel GETs observed) |
| Auth / 403 | Not the issue (all 200) |
| `settlements-loader` staff `coverageNote` | Set on merged payload (`staffBranchMergedCoverageNote`, count N + unassigned caveat, `publicSettlementsCoverageNote` on upstream) |

Merged response can carry a non-empty `coverageNote` even when all slices are empty.

---

## Concrete FE bug (verified in source)

**File:** `src/components/wallet-accruals/WalletAccrualsWorkspace.tsx`

After successful load, when `isWalletSettlementsDataEmpty(response)` is true and `walletEmptyViewerRole` is supported (e.g. **company** for manager), the component **returns early**:

```237:248:src/components/wallet-accruals/WalletAccrualsWorkspace.tsx
  if (
    !agentRegistry &&
    isSupportedWalletEmptyViewerRole(walletEmptyViewerRole) &&
    isWalletSettlementsDataEmpty(response)
  ) {
    return (
      <WalletSectionEmptyState
        role={walletEmptyViewerRole}
        canLinkOnboardingHistory={canLinkOnboardingHistory}
      />
    );
  }
```

The normal path that renders **`WalletAccrualsShell`** with  
`coverageNote={publicSettlementsCoverageNote(response.coverageNote)}` is **below** (lines 297–312).

`WalletSectionEmptyState` has **no** `coverageNote` prop — only onboarding «ПОКА ПУСТО» copy (`data-testid="wallet-empty-state"`).

**Effect:** For **any** staff session that uses **multi-branch merge** (`walletLedgerBranchIds` set) and gets **empty merged ledger**, users see owner-style onboarding empty **without** the staff scope / unassigned disclaimer — exactly when that disclaimer matters most.

This is **generic** (any org staff with granted branch merge + empty slices), not a personal exception.

---

## Proposed minimal product fix (not implemented; await approval)

**Single guard** — do **not** take the onboarding empty shortcut when staff merged fetch is active:

```typescript
const staffMergedBranchLedger = Boolean(walletLedgerBranchIds?.length);

if (
  !agentRegistry &&
  isSupportedWalletEmptyViewerRole(walletEmptyViewerRole) &&
  isWalletSettlementsDataEmpty(response) &&
  !staffMergedBranchLedger
) {
  return <WalletSectionEmptyState ... />;
}
```

Staff with empty merged data then reaches `WalletAccrualsShell` (business tabs, zero totals, `data-testid="wallet-coverage-note"` with staff copy). **Owner** and **staff single-path** behavior unchanged (`walletLedgerBranchIds` omitted → empty still uses `WalletSectionEmptyState` if desired).

**Optional follow-up (not required for scope text):** short muted line under empty totals vs full onboarding hero — product decision.

**Do not** claim full owner parity on empty UI alone; empty slices may still differ from owner aggregate for null-branch rows (backend/data).

---

## Live vs QA (nonempty QA ≠ real goal)

Prior harness `company-staff-6` with **synthetic rows** only proved merge + fetch log. It does **not** prove manager balance on a real account.

**Replay 6× empty slices (existing harness, no new vitest matrix):**

Branch: `qa/wallet-multi-branch-harness-ca9358f3` @ `c9023015` (alias runtime `a42b6dc1` for `src/`).

1. `pnpm run harness:settlements-qa`
2. Temporarily in `scripts/settlements-visual-qa/mocks/company-wallet-fixtures.ts`, make `qaBranchScopedSettlements` return  
   `{ receivable: [], payable: [], completed: [], coverageNote: "" }` (local only, do not commit), **or**
3. One-line harness extension (future QA-only): `&staffSlices=empty` on existing `?scene=company-staff-6` so mock returns empty slices while **real** `settlements-loader` still builds staff `coverageNote` — reproduces live UX bug on `a42b6dc1`.

**Acceptance after FE fix:** same URL shows `wallet-coverage-note` (staff text) instead of only `wallet-empty-state`, with 6 URLs in `__QA_SETTLEMENTS_FETCH_LOG__`.

**Owner control:** `?scene=company-owner` — single GET; owner mock may still include unassigned row when slices non-empty (harness honesty doc).

---

## Backend / data (handoff only)

If owner sees rows and staff merged empty with same grants, investigate navigator per-branch settlement scoping and null-branch accruals **outside** this repo. FE fix above addresses **missing disclaimer**, not populating rows.

---

*Docs-only diagnosis; no product commit in this handoff.*
