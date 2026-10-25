# STORE-COMPANY-WALLET-01

**Status: READY FOR REVIEW (isolated harness)** — not deployed; no production migrate or payouts.

## Bases (pinned start)

| Repo | Base SHA |
|------|----------|
| remcard-partner-platform | `6dde2193fe481d111aef64750ecac5c24f4f6c51` |
| remcard-navigator | `9c61f8141ab28d47f10092235498c30cd3a50076` |

## Runtime / evidence (final capture)

| | SHA / time |
|--|--|
| Frontend application | `60798b3667ca1b84a61d46a502909c9766a9ee10` |
| Backend application | `d2f65f507da7de85ec1b86416fd90cb61d241375` |
| Branches | `feat/store-company-wallet-01` (both repos) |
| Capture UTC | `2026-10-25T19:52:51.000Z` → `2026-10-25T19:54:55.603Z` |
| Gate exit | `shell-browser-gate.exit` = `0` |

## Reuse map → business delta

| Donor | Reuse | Delta |
|-------|-------|-------|
| `SpecialistMasterWallet` / `SpecialistSettlementsWorkspace` | Full ledger (overview, partners, orders, history, reconciliation), filters, export XLSX, `formatMoneyRub`, loaders/mappers/links | Thin `BusinessOwnerWallet` + copy labels («К выплате партнёрам»); payout modal wired in workspace (removed MASTER-only stub) |
| `AgentPayoutRequisitesPanel` + API | Owner-scoped requisites list/mask/CAS | Backend `canAccessOwnerPayoutRequisites` admits business STORE/COMPANY owners |
| `PayoutRecordModal` / `recordBonusPayoutFact` | Payable bonus payout fact + idempotency | Prof-test delegated sessions blocked for STORE/COMPANY/MASTER writes (requisites + `/api/bonus/[id]/pay`) |
| `resolveSettlementsPageShell` + `CabinetShell` / business nav | Route `/settlements`, «Кошелёк» | Business nav mode → `master-wallet` shell before R05; headings «Магазин»/«Компания» |
| Backend `proSettlements`, `authorizeSettlementWalletRead`, `bonusPayout` | Subjects, both directions, payoutActions | `isAgentR05IncomingOnlyWallet` skips business owners; export route uses `canUseMasterSettlementsExport` |

**No schema migrations.**

## Contracts

- **Directions:** receivable + payable for business owners; R05 incoming-only does not apply to `business-store` / `business-company` cabinet modes.
- **Pure AGENT** on `partnerType=STORE` unchanged: R05 shell when eligible.
- **Ownership:** settlement scope via existing `resolveSettlementSubjects`; prof-test catalog users cannot mutate requisites or record payouts on STORE/COMPANY/MASTER.
- **Real owners:** synthetic `realOwner` sessions (non–prof-test) run full UI path including payout record and reload.

## Fixture readback (seed `seed-business-wallet-gate-fixtures.ts`)

Per owner (store + company): open payable **1200 ₽** / **950 ₽** and receivable **800 ₽** / **650 ₽** (kopecks in DB); gate asserts API payable rows before UI payout. After UI payout, payable row closes; idempotent replay returns 200/409 without second effect.

## Commands & exits

```bash
# Gate (catalog QA isolated, ports 3430/3431)
bash scripts/store-company-wallet-01/run-browser-gate.sh

# Targeted tests
cd remcard-navigator && npm test -- --run src/lib/__tests__/businessWalletAdmission.test.ts src/lib/__tests__/ownerPayoutRequisitesMutatingAccess.test.ts
cd remcard-partner-platform && npm test -- --run src/components/specialist-wallet/SpecialistSettlementsWorkspace.test.tsx
node --test src/lib/settlements-page-shell.test.ts
```

Gate stdout: `ok: true` in `shell-gate.json` / `metadata-shell.json`. Backend full `tsc` baseline (~52 diagnostics) not claimed green.

## Artifacts

- `shell-gate.json`, `metadata-shell.json`, `shell-browser-gate.log`, `shell-browser-gate.exit`
- Screenshots: `visual-shell/store-wallet-real-*`, `visual-shell/company-wallet-real-*` (1440/390/320, light/dark)

## Changed files (summary)

**Backend:** `businessWalletAdmission.ts`, `agentR05IncomingOnly.ts`, `masterOwnerRequisitesAccess.ts`, `ownerPayoutRequisitesMutatingAccess.ts`, `wallet/settlements/export/route.ts`, `bonus/[id]/pay/route.ts`, seed script, tests.

**Frontend:** `settlements/page.tsx`, `BusinessOwnerWallet.tsx`, `business-wallet/copy.ts`, `settlements-page-shell.ts`, `SpecialistSettlementsWorkspace.tsx`, gate scripts.
