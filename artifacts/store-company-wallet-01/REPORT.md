# STORE-COMPANY-WALLET-01

**Status: READY FOR REVIEW (isolated harness)**

## Block 1 (accepted — unchanged this iteration)

Canonical business / legacy-agent guard and prof-test financial policy were **not** modified. Backend admission tests and `pg-prof-test-financial-guard.log` remain the accepted baseline.

## Runtime capture (combined gate)

| | |
|--|--|
| **Frontend** | `a418561e904101e53b24e02a5469776de2281c5b` |
| **Backend (gate runtime)** | `a0b3d71c191e7c197fbd80cbadd27c3adf8389f1` |
| **Backend product tip delta** | `a0b3d71c` = `d9374b6f` + integration test-only commit (`profTestOwnerFinancialWrite.integration.test.ts` node env); no product guard change |
| **Branch** | `feat/store-company-wallet-01` (both repos) |
| **Capture UTC** | `2026-10-25T20:51:07.000Z` → `2026-10-25T20:53:20.903Z` |
| **Exit** | `shell-browser-gate.exit` = `0`, `shell-gate.json` `ok: true`, `failures: []` |

Prior evidence SHA pair `7562b289` / `d9374b6f` superseded by this capture.

## Block 2 — product UI path (no API fallback)

### Requisites (STORE + COMPANY `realOwner`)

- Fills **all** required fields including `bank-correspondent`; `form.checkValidity()` before submit.
- **No** `page.request.post` fallback on create; gate fails if UI POST missing.
- UI POST create → masked list GET → authorized detail GET → **Посмотреть** detail in panel.
- Stale `expectedVersion` PATCH → **409**; UI **Изменить** PATCH (revise) → new `requisitesId`, version bump, reload shows edited legal name.

### Settlements workspace

- Exact payable/receivable sums vs `walletGate` fixture IDs.
- Receivable filter: nonsense query → empty; partner substring → row amount visible.
- **Покупка** link → `/history/purchases/{orderId}` → return.
- **Excel (.xlsx, весь отбор)** button → Playwright **download**; full sheet parsed — exact row set (orderId, amount, partner, status), no extras/foreign rows.
- Payout modal → DB snapshot: one `BonusPayoutRecord`, `PAID`, `CASH`, idempotency present; replay `replay: true`, count stays 1; completed API contains bonus; overview payable total excludes paid amount.

### Fixture amounts (unchanged)

| Owner | Payable | Receivable |
|-------|---------|------------|
| Store | 1200 ₽ | 800 ₽ |
| Company | 950 ₽ | 650 ₽ |

## Block 3 — context / access / races

### Frontend

- `scopeKey` = `{partnerType}:{ownerUserId}` from settlements page (not STORE/COMPANY alone).
- Settlements `load()` uses generation token; stale responses cannot restore data after scope switch / 403 / unmount; single initial fetch effect.
- Tests: `SpecialistSettlementsWorkspace.scope.test.tsx` (deferred fetch, late success after 403, retry, unmount) + existing payout modal tests.

### Gate access matrix

- Anonymous settlements **401**.
- Delegated prof-test **STORE** and **COMPANY**: settlements read OK; requisites POST **403** `PROF_TEST_BLOCKED`; payout POST deny, **0** new payout records.
- Company vs store bonus (pre-payout): foreign payout **403/404**, ledger has no foreign bonus id.
- Company vs store (post store flow): foreign requisites detail/patch **403/404**; export rows exclude store `payOrderId`; no payout re-test on already-settled bonus.

## Commands

```bash
bash scripts/store-company-wallet-01/run-browser-gate.sh
cd remcard-partner-platform && npm test -- --run \
  src/components/specialist-wallet/SpecialistSettlementsWorkspace.test.tsx \
  src/components/specialist-wallet/SpecialistSettlementsWorkspace.payout.test.tsx \
  src/components/specialist-wallet/SpecialistSettlementsWorkspace.scope.test.tsx
```

## Artifacts

- `shell-gate.json`, `metadata-shell.json`, `shell-browser-gate.log`, `shell-browser-gate.exit`
- `pg-prof-test-financial-guard.log`
- `visual-shell/store-wallet-real-*`, `visual-shell/company-wallet-real-*`

No main / deploy / production SQL / real-money writes outside isolated catalog QA.
