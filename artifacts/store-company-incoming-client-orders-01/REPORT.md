# STORE-COMPANY-INCOMING-CLIENT-ORDERS-01

**Status: FINAL READY FOR INDEPENDENT REVIEW** (not deployed)

## Evidence tip (aligned gate run)

| | SHA / time |
|--|--|
| Frontend | `dcb780830806df26e43d73e163556ece698d453a` |
| Backend | `e1e663325310918ffa68c0846347fde77c765ccf` |
| Capture | `2026-10-25T14:49:35.000Z` → `2026-10-25T14:51:38.874Z` |
| Gate exit | `artifacts/store-company-incoming-client-orders-01/shell-browser-gate.exit` = 0 |

Artifacts: `shell-gate.json`, `metadata-shell.json`, `migration-verify.json`, `shell-browser-gate.log`, `visual-shell/*-{light,dark}-390.png`.

## Bases (undeployed clients package)

| Repo | Clients base |
|------|----------------|
| remcard-navigator | `8b1e932e` |
| remcard-partner-platform | `5281a1de` |

## Migrations (additive)

1. `20261025143000_store_company_incoming_client_order_link`
2. `20261025180000_incoming_client_link_revision_audit`

Catalog QA verify: `verify-incoming-client-order-migrations.ts` (schema/tables/linkedAt/unique; production uses migrate deploy ledger).

## Review fix summary

- **CAS / audit:** `OrderReceivingClientAnchor.revision`, mandatory `expectedVersion`, transactional bump + events (`LINK`/`CHANGE`/`UNLINK`), `linkedAt`.
- **Priority:** explicit link only on chosen client; own-issued fallback requires no link row and `fallbackSuppressed=false`.
- **Delete:** `evaluateAgentClientDelete` for single + batch.
- **UI:** pending confirm per action, search generation guard, order-scoped PATCH callback, 409 reload; `PurchaseReceivingClientPanel.race.test.tsx`.
- **Gate:** UI link → change → unlink, API readback, foreign CRM deny, financial fields unchanged, STORE + COMPANY screenshots.

## Tests

- BE unit: `orderReceivingAgentClientLink.test.ts` (exit 0)
- BE integration: `orderReceivingClientLink.integration.test.ts` (prof R01 DB when configured)
- FE: `PurchaseReceivingClientPanel.race.test.tsx`; proxy PATCH allowlist test
- Isolated E2E: `scripts/store-company-incoming-client-orders-01/run-browser-gate.sh`

Backend full `tsc` remains legacy exit 2 (~52 baseline diagnostics); not claimed green.

## Migration release checklist (prepare only)

Backup → read-only preflight → apply both migrations in order → deploy backend then frontend → smoke link/change/unlink/batch skip → rollback app without dropping anchor/event/link tables.
