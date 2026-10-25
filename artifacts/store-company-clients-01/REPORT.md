# STORE-COMPANY-CLIENTS-01 (A/B/C closure)

**Status: ACCEPTED WITH DOCUMENTED A LIMIT** — not «полный READY» по покупкам у нас для чужих входящих сертификатов.

## A — Purchases (honest scope)

| Slice | Contract |
| --- | --- |
| **Supported** | **Own-issued accepting:** «Покупки у нас» только по нашим сертификатам с `agentClientId` на CRM-клиенте. |
| **BLOCKED** | **Incoming third-party recommender** at our store — `BLOCKED_MISSING_LINK` (нет связи AgentClient ↔ заказ без schema). Leak fixture: foreign issuer order id not in receiving list. |
| **Recommendations (business)** | Owner-issued certs at partners; legacy nullable `certificatePartnerId` on recommendation side. |
| **Agent/specialist** | `listAgentClientLegacyPurchases` unchanged. |

## B / C

Accepted per review (both ordinary owners, cert id, mutations, detail/gate retry).

## C — List race evidence

- `src/components/agent-r03/AgentClientsList.race.test.tsx` — mounted list, mocked `fetchAgentClients`, beta resolves then alpha resolve/reject; DOM + selection clear.

## Runtime capture (unchanged since bb3e7575 gate)

Application code **not changed** in list-race test commit; gate artifacts remain valid.

| Field | Value |
| --- | --- |
| FE application SHA (gate) | `bb3e757536910383f1f0e7d871810ae347c9c84f` |
| BE application SHA | `8b1e932ea9c611ccb5e2aac18ab50dac7faebbf1` |
| Capture | `2026-10-25T14:16:27.000Z` → `2026-10-25T14:18:38.524Z` |
| Exit | `0` |
| stdout / `shell-gate.json` / `metadata-shell.json` | Same `applicationRuntime` |

Command: `bash scripts/store-company-clients-01/run-browser-gate.sh`

## Branches

| FE evidence tip (tests + REPORT) | `f5fcc96d4ad9a6e9c569ff66b39f5ca5d63a2030` |
| Runtime unchanged | gate at `bb3e7575` / `8b1e932e` (no re-run for test-only commit) |

Vitest (mounted list race): `AgentClientsList.race.test.tsx` 2 passed; with `AgentClientDetail.race.test.tsx` + `business-clients/*` → **7 passed / 4 files**.
