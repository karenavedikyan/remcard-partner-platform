# Wallet branch-merge QA (candidate `ca9358f3`)

**Runtime SHA under test:** `ca9358f3511211113804cca5b49052e72017e11f`  
**Harness path:** `scripts/settlements-visual-qa/` (existing Vite visual QA, mocked loader — no RemCard login/finance)

## Commands

```bash
git checkout ca9358f3511211113804cca5b49052e72017e11f   # or QA branch below

# Unit / loader (synthetic, no browser)
pnpm exec vitest run \
  src/lib/business-wallet/settlements-branch-fetch.test.ts \
  src/lib/business-wallet/access.branch-ledger.test.ts

# UI harness (mocked @/lib/settlements-loader + auth-session)
pnpm run harness:settlements-qa
# open:
#   http://127.0.0.1:5211/?scene=company-owner
#   http://127.0.0.1:5211/?scene=company-staff-6
#   http://127.0.0.1:5211/?scene=company-staff-1
#   http://127.0.0.1:5211/?scene=company-staff-403

# Optional screenshots (Playwright; harness must be running)
pnpm run harness:settlements-qa:capture
# -> artifacts/partner-wallet-20261103/wallet-settlements/screenshots/
```

| Scene | What it exercises |
|--------|-------------------|
| `company-owner` | Single aggregate GET path (`walletLedgerBranchIds` omitted) |
| `company-staff-6` | 7 synthetic branches (HO + b1–b6), merge → 7 receivable rows |
| `company-staff-1` | One `branchId`, single partner row |
| `company-staff-403` | Full branch list; `branch-b4` → 403 → error alert, no partial UI |

**DOM hooks:** `data-testid="qa-company-wallet-owner"`, `qa-company-wallet-staff-6`, etc.; wallet shell `business-owner-wallet`, load/error `wallet-accruals-loading` / `wallet-accruals-error`.

## Local dev-fixture (specialist only — not branch-merge)

`/settlements/dev-fixture` — `masterWalletFixtureData` preview, **does not** cover company staff multi-branch (NODE_ENV !== production).

## Caveat (backend / product)

Navigator may attach orders with **null / unscoped branch** only on owner aggregate. Per-branch `?branchId=` staff merge is **union of branch-scoped API rows**, not a proof of **bitwise identity** with owner aggregate. Do **not** claim “company wallet equals owner” for unassigned historical orders.

## Backend auditor (same facts)

Live navigator: `authorizeSettlementWalletRead` with `requireFullOrgCoverage: false`; branch resolution single `activeBranch`; no `all` / `full_org` wallet token. Partner FE `ca9358f3` merges explicit granted-branch GETs client-side.
