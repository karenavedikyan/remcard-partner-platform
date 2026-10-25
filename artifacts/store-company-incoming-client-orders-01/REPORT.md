# STORE-COMPANY-INCOMING-CLIENT-ORDERS-01

**Status: READY FOR INDEPENDENT REVIEW (isolated harness)** — not deployed; not production migration apply.

## Evidence tip (single final capture — refresh after last push)

Gate runner: `scripts/store-company-incoming-client-orders-01/run-browser-gate.sh`

Record from gate stdout JSON: `application.frontendSha`, `application.backendSha`, `captureStartedAt`, `captureCompletedAt`.

Artifacts (one clean run):

- `shell-gate.json`, `metadata-shell.json`
- `migration-sql-verify.json` — **two migration.sql files** on disposable PG schema (FK + unique + indexes)
- `pg-delete-link-race.log` — concurrent delete/link integration (catalog QA PostgreSQL)
- `shell-browser-gate.log` (truncated each run), `shell-browser-gate.exit` (single line)
- `visual-shell/*` — purchase linked + **client receiving linked (before unlink)**

## Bases

| Repo | Clients base |
|------|----------------|
| remcard-navigator | `8b1e932e` |
| remcard-partner-platform | `5281a1de` |

## Third review closure (only remaining items)

1. **Delete/link race** — `FOR UPDATE` on `AgentClient` in link + soft-delete transactions; concurrent integration test in gate.
2. **UI reset** — scope reset clears `saving`/`createOpen`, reloads clients on order change; PATCH `finally` always clears saving; extended panel race test.
3. **SQL migrations** — `apply-incoming-client-order-migrations-sql.mjs` applies both `.sql` files on disposable schema; index `OrderReceivingClientAnchor_receivingOwnerUserId_idx` added to migration file.

## Migrations

- `20261025143000_store_company_incoming_client_order_link`
- `20261025180000_incoming_client_link_revision_audit`

Production path: migrate deploy ledger (not executed here).

## Tests

| Suite | Where |
|-------|--------|
| Panel race (2) | partner-platform vitest |
| Delete/link race (1) | navigator vitest on catalog QA PG (in gate) |
| SQL migration apply | gate `migration-sql-verify.json` |
| UI E2E STORE+COMPANY | gate runner (link UI create, batch skip, company cross-order deny) |

Backend full `tsc` remains legacy exit 2 (~52 baseline).

## Migration release checklist (prepare only)

Backup → preflight → apply both migrations in order → backend → frontend → smoke → rollback app without dropping new tables.
