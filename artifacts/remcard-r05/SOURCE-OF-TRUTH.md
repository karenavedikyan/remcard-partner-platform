# R05 — Agent receivables source of truth

## Canonical ledger

- **Primary rows:** `AgentBonus` where `agentUserId` = principal agent owner (`resolvePrincipalAgentBusiness`).
- **Not summed with `Bonus`:** for agent-issued certificates the accrual is `AgentBonus`; `Bonus.proUserId` receivable is the master/issuer path when issuer is not agent-classified. R05 UI reads **only AgentBonus** to avoid double counting one order.
- **No parallel ledger:** HTTP `GET /api/pro/wallet/settlements` unchanged; R05 uses dedicated read routes under `/api/pro/wallet/agent-receivables/*`.

## Inclusion rules

| Check | Effect |
|-------|--------|
| `certificatePartner` missing | `needs_review`, excluded from confirmed total |
| `Order.status` CANCELLED/RETURNED | treated as cancelled debt |
| `Order.isSelfScan` | excluded (`needs_review`) |
| `AgentBonus.status` CALCULATED | pending — not in confirmed debt |
| CONFIRMED / AVAILABLE | open debt = full `amount` (kopecks) |
| PAID | history; paid = full amount via `paidAt` (no BonusPayoutRecord on AgentBonus) |
| CANCELLED | history, debt 0 |

## Payments / remainder

- AgentBonus has **no** `BonusPayoutRecord` child; partial payout is **not** modeled in canonical data (documented gap — UI must not invent partial remainders).
- Remaining = obligation kopecks when open; 0 when paid/cancelled/pending.

## Counterparty

- Payer side = `certificatePartner.storeUserId` (confirmed accepting store), not `Order.storeUserId` executor.
- Legal caption from saved `certificatePartner.storeName` + owner org INN when present; current profile may differ (shown in copy).

## Due date

- No persisted payout term on order → UI label **«Не согласован»**; overdue/soon filters disabled until real dates exist.

## Rounding

- API amounts in **integer kopecks**; display divides by 100 once. Line totals compared to accrual with 1 kopeck tolerance.

## Gate

- `PROF_R05_AGENT_RECEIVABLES_ENABLED` (default OFF). Eligibility: `resolvePrincipalAgentBusiness` only.
