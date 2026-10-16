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

## Status

See `TEST-RESULTS.json` for `READY_FOR_REVIEW` / `BLOCKED`, exact HEAD SHAs, exit codes.
