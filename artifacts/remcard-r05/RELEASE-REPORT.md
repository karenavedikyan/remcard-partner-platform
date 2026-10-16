# R05.2 — RELEASE REPORT

| Repo | PR | Branch |
|------|-----|--------|
| remcard-navigator | [#686](https://github.com/karenavedikyan/remcard-navigator/pull/686) | `cursor/r05-agent-receivables-b3e3` |
| remcard-partner-platform | [#23](https://github.com/karenavedikyan/remcard-partner-platform/pull/23) | `cursor/r05-agent-receivables-b3e3` |

## 1 — Partner aggregate + drill-down (P0)

- Top-level `partnerGroupKey` = `{storeUserId}:branch:{branchId|hq}` (no `certificatePartnerId`).
- Orders API filters by `groupKey`; UI passes `selectedPartner.groupKey`.
- Regression: `agentReceivables.readmodel.test.ts` + BFF probe `r05P0TwoCertAggregateSeed.ts` (M1 Test Store, 10 000 + 20 000 kop → one card, drill-down sum match).

## 2 — Partner sort «По дате покупки»

- `earliestPurchaseAt` on partner groups; `sortPartnerGroups` handles `due-asc` with `groupKey` tie-breaker (purchase date, not payout due).

## 3 — Visual (frozen reference alignment)

- Overview tile: amount left under label, accent panel, CTA «Посмотреть партнёров».
- Wallet tabs: «Взаиморасчёты / Реквизиты» via `AgentReceivablesWallet` + `AgentPayoutRequisitesPanel` (read-only).
- Partners: horizontal compact rows; focus header → view → search drawer → list; grid densities 3/2/1.
- Orders/detail: reference-like summary + breakdown blocks.

**Not claimed:** pixel-perfect 1:1 with prototype demo data.

## 4 — Evidence

- `artifacts/remcard-r05/screenshots/impl-r05-*` + `ref-r05-prototype-entry-1440-light.png`
- Light captures reset `colorScheme` / `data-theme` before shot.
- `TEST-RESULTS.json`: real vitest exit code, all functional gates in `pass`.

See `TEST-RESULTS.json` for HEAD SHAs and section PASS/FAIL.
