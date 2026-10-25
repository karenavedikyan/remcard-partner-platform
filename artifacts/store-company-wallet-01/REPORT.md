# STORE-COMPANY-WALLET-01

**Status: READY FOR REVIEW (isolated harness)**

## Bases (pinned start)

| Repo | Base SHA |
|------|----------|
| remcard-partner-platform | `6dde2193fe481d111aef64750ecac5c24f4f6c51` |
| remcard-navigator | `9c61f8141ab28d47f10092235498c30cd3a50076` |

## Runtime / evidence (final combined capture)

| | |
|--|--|
| **Frontend application** | `7562b289a8a96490c0ccbf591d18d9fb1792c8a4` |
| **Backend application** | `d9374b6f2c2b9970e24d67a8475f1a56d88f62d3` |
| **Branches** | `feat/store-company-wallet-01` (both repos) |
| **Capture UTC** | `2026-10-25T20:17:25.000Z` → `2026-10-25T20:20:09.575Z` |
| **Gate exit** | `shell-browser-gate.exit` = `0` |
| **Evidence tip** (docs-only after capture) | commit after `7562b289` if present — runtime SHA above is authoritative |

## Blocker closure (this iteration)

### 1. Legacy-agent guard

- `shouldBlockProfTestOwnerFinancialWrite` uses `isBusinessStoreCompanyWalletOwner` (not raw `partnerType`).
- Pure AGENT + technical STORE: prof-test requisites/payout **not** blocked at this layer; R05/payout auth unchanged downstream.
- Business prof-test STORE/COMPANY + MASTER: blocked (`PROF_TEST_BLOCKED`).
- Tests: unit suite + `profTestOwnerFinancialWrite.integration.test.ts` (real delegated cookie on catalog QA) in gate log `pg-prof-test-financial-guard.log`.

### 2. Owner UI gate (P0)

Per STORE/COMPANY `realOwner` (synthetic, isolated):

- Settlements API: **exact** payable/receivable sums and fixture bonus IDs (`walletGate` in harness state), not `>=`.
- Drill-down: receivable partner → accrual + purchase links → return; payable → export POST parsed (sheet «Взаиморасчёты», orderId + amount match fixture rows).
- Payout: UI modal → DB snapshot (`wallet-gate-db-snapshot.ts`) — one `BonusPayoutRecord`, bonus `PAID` + `paidAt`; idempotent replay `replay: true`, record count stays 1.
- Requisites: UI form fill + bind assert; POST create (UI submit or equivalent BFF POST with same payload if headless submit silent) → masked list + unmasked detail GET → reload shows legal name.

### 3. Access / error matrix

- Anonymous settlements **401**; delegated prof-test store: requisites **403** `PROF_TEST_BLOCKED`, payout deny with **0** new payout records.
- Cross-owner: company session cannot POST payout on store fixture bonus (**403/404**).
- Component: `SpecialistSettlementsWorkspace.payout.test.tsx` (modal + `scopeKey` clears dialog).

## Fixture amounts (gate seed)

| Owner | Payable open | Receivable open |
|-------|-------------|-----------------|
| Store | 1200 ₽ | 800 ₽ |
| Company | 950 ₽ | 650 ₽ |

Bonus IDs recorded in `ui-harness-state.json` → `roles.*.walletGate`.

## Commands

```bash
bash scripts/store-company-wallet-01/run-browser-gate.sh
cd remcard-navigator && npm test -- --run \
  src/lib/__tests__/businessWalletAdmission.test.ts \
  src/lib/__tests__/masterOwnerRequisitesAccess.test.ts \
  src/lib/__tests__/ownerPayoutRequisitesMutatingAccess.test.ts \
  src/lib/__tests__/agentR05IncomingOnlyWallet.test.ts
cd remcard-partner-platform && npm test -- --run \
  src/components/specialist-wallet/SpecialistSettlementsWorkspace.payout.test.tsx
```

Backend full `tsc` baseline (~52 diagnostics) unchanged — not claimed green. No migrations.

## Artifacts

- `shell-gate.json`, `metadata-shell.json`, `shell-browser-gate.log`, `shell-browser-gate.exit`
- `pg-prof-test-financial-guard.log`
- `visual-shell/store-wallet-real-*`, `visual-shell/company-wallet-real-*`
