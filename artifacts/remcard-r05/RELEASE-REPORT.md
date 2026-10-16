# R05.1 — RELEASE REPORT

| Repo | PR | Branch |
|------|-----|--------|
| remcard-navigator | [#686](https://github.com/karenavedikyan/remcard-navigator/pull/686) | `cursor/r05-agent-receivables-b3e3` |
| remcard-partner-platform | [#23](https://github.com/karenavedikyan/remcard-partner-platform/pull/23) | `cursor/r05-agent-receivables-b3e3` |

## A — Historical requisites

| Fix | Command / check | Result |
|-----|-----------------|--------|
| `partnerLegalFromOrder` uses `storeName` only for historical name; INN not taken from live org | `vitest agentReceivables.readmodel.test.ts` | PASS |
| Missing snapshot → «Исторические реквизиты не сохранены» + optional `currentProfileCaption` | UI order detail + partner `legalCaption` | PASS |
| Stable `partnerGroupKey` (`storeUserId` + `certificatePartnerId` + branch) | readmodel + integration INN change test | PASS (integration if PG) |
| SOURCE-OF-TRUTH payer chain | `artifacts/remcard-r05/SOURCE-OF-TRUTH.md` | updated |

## B — Filters / search / totals

| Fix | Check | Result |
|-----|-------|--------|
| Partners API respects `status` (no forced `open`) | readmodel pending filter test | PASS |
| Period `from`/`to` on purchase UTC date | UI date inputs + meta `periodField` | PASS |
| Category search full set | BFF `q=кровля` + readmodel | PASS |
| `selectionTotalKopecks` vs cabinet overview | UI `ledger-totals` | PASS |
| Sort tie-breaker `sortId` | readmodel | PASS |
| Ledger view densities | CSS `[data-ledger-view]` | PASS (not pixel-ref) |

## C — Confirmed debt integrity

| Fix | Check | Result |
|-----|-------|--------|
| Line/accrual mismatch → `needs_review` before totals | `evaluateAccrualLineIntegrity` + `buildOverview` test | PASS |
| Detail uses same integrity helper | shared code path | PASS |

## D — Incoming-only

| Fix | Check | Result |
|-----|-------|--------|
| Settlements strip payables when R05 eligible | `agentR05IncomingOnly.test.ts` + BFF settlements | PASS |
| Gate OFF unchanged | not exercised in this run | NOT_VERIFIED |

## E — Browser / evidence

| Step | Result |
|------|--------|
| admin → agent → overview → partners → orders → detail → pagination → densities | see `TEST-RESULTS.json` |
| PNG | `artifacts/remcard-r05/screenshots/impl-r05-*.png` (SHA in JSON) |
| Ref parity | **NOT pixel-perfect** — frozen ref uses demo dataset |

## Evidence (impl PNG)

Committed under `artifacts/remcard-r05/screenshots/` — e.g. `impl-r05-overview-1440-light.png`, `impl-r05-partners-1440-light.png`, `impl-r05-orders-1440-light.png`, `impl-r05-order-detail-1440-light.png`, dark/375/320 variants. SHA-256 in `TEST-RESULTS.json` → `captures[]`.

Ref prototype (`roles.js` SHA `0c9a8be6…`) uses demo data — **not** pixel-perfect parity.

## Status (last run)

| HEAD | SHA |
|------|-----|
| remcard-navigator | `33a9eb14671ad31ad1952679608000a104cf6437` |
| remcard-partner-platform | see `TEST-RESULTS.json` after commit |

`TEST-RESULTS.json`: **READY_FOR_REVIEW** when `pass: true`.
