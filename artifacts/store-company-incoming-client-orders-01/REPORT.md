# STORE-COMPANY-INCOMING-CLIENT-ORDERS-01

**Status: FINAL READY FOR INDEPENDENT REVIEW** (not deployed)

## Bases and dependency chain

| Repo | Branch | Base (clients package tip) | Role |
|------|--------|----------------------------|------|
| remcard-navigator | `feat/store-company-incoming-client-orders-01` | `8b1e932ea9c611ccb5e2aac18ab50dac7faebbf1` | Backend + migration |
| remcard-partner-platform | `feat/store-company-incoming-client-orders-01` | `5281a1de1da0d397690e4821e8ba40fce533b6aa` | UI + gate |

This release **includes** the undeployed `feat/store-company-clients-01` stack; it is not a delta on `main` alone.

## Plan and model

See `remcard-navigator/PLAN.md`. Additive table `OrderReceivingAgentClientLink` (unique `orderId`, FK to `Order` + `AgentClient`, `receivingOwnerUserId`, `linkedByUserId`, `version`).

Migration path: `prisma/migrations/20261025143000_store_company_incoming_client_order_link/migration.sql`

## API / UI

- `PATCH /api/store/orders/[orderId]/receiving-client` — owner-only link/unlink (idempotent, version conflict 409).
- `GET /api/store/orders/[orderId]` — owner extras: `receivingClient`, `recommendationSource`, `canManageReceivingClient`.
- `listAgentClientReceivingPurchases` — explicit links ∪ own-issued cert path; recommender display name only.
- Purchase detail: `PurchaseReceivingClientPanel`; client detail updated receiving copy + order links.

## Tests

- Unit: `orderReceivingAgentClientLink.test.ts` (vitest, exit 0).
- Integration (isolated DB only): `orderReceivingClientLink.integration.test.ts` when `DATABASE_URL` is prof R01 test DB.
- Frontend `tsc --noEmit`: clean on partner-platform tip.

Backend full `tsc` retains pre-existing diagnostic baseline (~52 issues); not claimed green.

## Isolated migration verify

On disposable fixture DB only:

```bash
cd remcard-navigator
DATABASE_URL=… npx prisma migrate deploy
# re-run deploy → idempotent; FK/uniqueness enforced by schema
```

**Rollback code without dropping table:** old code ignores link table; links remain in DB until explicit cleanup. New code reads links; rolling back frontend/backend together keeps data consistent.

## Migration release checklist (prepare only)

1. Backup production DB snapshot.
2. Read-only preflight: `SELECT COUNT(*) FROM "Order"` baseline; confirm no name collision on `OrderReceivingAgentClientLink`.
3. Apply additive migration via standard ledger workflow (single CREATE TABLE + indexes + FKs).
4. Deploy **backend** first, then **frontend** (proxy allowlist includes PATCH route).
5. Smoke: owner opens incoming purchase → link client → client receiving list shows order id; no second order/bonus on PATCH.
6. Rollback: revert app versions; **do not** drop link table if orders were linked in prod.

## Browser gate

Script: `scripts/store-company-incoming-client-orders-01/run-incoming-shell-e2e.mjs`

Requires harness seeds (clients gate + `seed-incoming-client-order-link-fixture.ts`) and running PROF stack. Artifacts under `artifacts/store-company-incoming-client-orders-01/visual-shell/` when capture is run in environment.

Record application SHAs from gate stdout JSON at capture time.
