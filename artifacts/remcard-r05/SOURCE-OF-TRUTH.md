# R05 — Agent receivables source of truth (r05.1)

## Chain: order → accrual → confirmation

1. **Purchase:** `POST /api/store/order` creates `Order` with `certificatePartnerId` (accepting store), `storeUserId` (executor), line `OrderItem` rows.
2. **Agent accrual:** `AgentBonus` row (`orderId` unique) with `agentUserId` = certificate issuer agent, `amount` = agent reward, `status` lifecycle (`CALCULATED` → `CONFIRMED`/`AVAILABLE` → `PAID`).
3. **Payer for R05:** **`certificatePartner.storeUserId`** — partner who accepted the certificate at purchase. Not `Order.storeUserId` when staff executes on behalf of store (see `proSettlements.integration.test.ts` staff transfer case).
4. **RemCard-initiated payout:** `AgentBonus` has no `BonusPayoutRecord`; `paidAt`/`payoutMethod` on `AgentBonus` when status `PAID`. No partial remainder in schema.

Code: `src/lib/agentReceivables/loadAgentReceivables.ts` (`mapRecord`, `classifyRow`, `evaluateAccrualLineIntegrity`).

## Canonical ledger

- **Rows:** `AgentBonus` for `resolvePrincipalAgentBusiness` owner only.
- **Not doubled with `Bonus`:** R05 read routes use AgentBonus only. Legacy `GET /api/pro/wallet/settlements` unchanged contract; R05 pilot filters payables when gate+eligible (`agentR05IncomingOnly.ts`).

## Inclusion / exclusion

| Check | State | Confirmed total |
|-------|--------|-----------------|
| No `certificatePartner` | `needs_review` | excluded |
| `Order.isSelfScan` | `needs_review` | excluded |
| Line sum ≠ accrual (>1 kop) | `needs_review` | excluded |
| Lines present, no reward breakdown | `needs_review` | excluded |
| `Order` CANCELLED/RETURNED | `cancelled` | excluded |
| `AgentBonus.CANCELLED` | `cancelled` | excluded |
| `CALCULATED` | `pending` | excluded |
| `CONFIRMED`/`AVAILABLE` | `open` | `remainingKopecks` = obligation |
| `PAID` | `paid` | history only |

## Historical legal side

- **Immutable on order:** `CertificatePartner.storeName` (order-era trade name). **No INN/KPP snapshot** on `CertificatePartner` / `Order` in schema.
- **UI:** `partnerLegal.inn` only when `historicalRequisitesSaved`; otherwise `missingHistoricalNote` = «Исторические реквизиты не сохранены». Current org from `organizationsOwned[0]` in `currentProfileCaption` only — never mixed into historical INN.
- **Grouping:** `partnerGroupKey` = `{storeUserId}:cp:{certificatePartnerId}:branch:{branchId|hq}` — stable when current INN/name changes.

## Filters / period / search

- **Period field:** `Order.createdAt` exposed as `purchaseAt` ISO; filter compares UTC calendar date (`YYYY-MM-DD`) on `from`/`to` query params.
- **Status:** same `recordMatchesFilter` for overview rows, partners, orders (no forced `open` on partners API).
- **Search:** partner name, legal name, order number, certificate code, client, creator, **order line categories** (`categorySearchText`) on full set before pagination.
- **Totals:** `meta.selectionTotalKopecks` respects active status filter; `meta.confirmedTotalKopecks` = open remaining within filtered set; overview `confirmedTotalKopecks` = cabinet-wide open total.

## Partial payments

Not stored on `AgentBonus` — UI must not show partial remainders; paid = full obligation.

## Due date

Not persisted → `dueLabel` «Не согласован»; `overdue`/`soon` filters return empty (not offered in UI).

## Rounding

Integer kopecks via `kopecksFromAmount`; line vs accrual tolerance **1 kopeck** (`ACCRUAL_LINES_TOLERANCE_KOPECKS`).

## Incoming-only (gate ON + eligible)

- `GET /api/pro/wallet/settlements` → `payable: []`, receivable without `payoutActions`, completed receivable-only.
- `GET /api/pro/wallet/balance` for AGENT already AgentBonus-only (no outgoing).
- Gate OFF: legacy behaviour preserved.

## Gate

`PROF_R05_AGENT_RECEIVABLES_ENABLED` (default OFF). Read routes 404 when OFF.
