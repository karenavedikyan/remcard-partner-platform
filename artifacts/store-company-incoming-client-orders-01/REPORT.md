# STORE-COMPANY-INCOMING-CLIENT-ORDERS-01

**Status: CHANGES REQUIRED → resubmission after review fixes** (not deployed)

## Bases

| Repo | Clients base | Feature branch |
|------|--------------|----------------|
| remcard-navigator | `8b1e932e` | `feat/store-company-incoming-client-orders-01` |
| remcard-partner-platform | `5281a1de` | `feat/store-company-incoming-client-orders-01` |

Includes undeployed `feat/store-company-clients-01` package.

## Review fixes (four groups)

1. **Write / audit / CAS** — `OrderReceivingClientAnchor.revision` with mandatory `expectedVersion`; atomic `updateMany` bump; audit `OrderReceivingAgentClientLinkEvent`; `linkedAt` on link row; P2002 → 409.
2. **Priority / delete** — own-issued fallback only when no explicit link and `fallbackSuppressed` false; explicit link to client B excludes order from client A; shared `evaluateAgentClientDelete` for single + batch delete.
3. **UI** — separate pending confirm for link vs unlink; search generation guard; PATCH scoped to order id; 409 reload; component race tests.
4. **Evidence** — `run-browser-gate.sh` + expanded UI/API runner; migration verify script; artifacts: `shell-gate.json`, `metadata-shell.json`, `migration-verify.json`, `shell-browser-gate.log`, `shell-browser-gate.exit`, PNGs under `visual-shell/`.

## Migrations (additive only)

- `20261025143000_store_company_incoming_client_order_link`
- `20261025180000_incoming_client_link_revision_audit`

Isolated verify: `scripts/prof-admin-moderation-isolated/verify-incoming-client-order-migrations.ts` (deploy twice + uniqueness check).

## Tests (targeted)

- Backend unit: `orderReceivingAgentClientLink.test.ts`
- Backend integration (prof R01 DB): `orderReceivingClientLink.integration.test.ts` — CAS, priority, unlink suppression, bounded cleanup
- Frontend: `PurchaseReceivingClientPanel.race.test.tsx`; proxy allowlist test for PATCH route
- Full stack: `scripts/store-company-incoming-client-orders-01/run-browser-gate.sh`

Backend full `tsc` remains exit 2 with legacy baseline (~52 diagnostics); not claimed green.

## Migration release checklist (prepare only)

1. Backup DB.
2. Read-only preflight counts on `Order` / new tables.
3. Apply both additive migrations in order via standard ledger workflow.
4. Deploy backend → frontend.
5. Smoke: link incoming purchase, change, unlink; batch delete skip `has_receiving_order_links`.
6. Rollback app without dropping link/anchor/event tables.

Record **evidence tip SHAs** from gate stdout `application.frontendSha` / `application.backendSha` and `captureCompletedAt` after a green gate run.
