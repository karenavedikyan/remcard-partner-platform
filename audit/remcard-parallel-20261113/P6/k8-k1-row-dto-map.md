# K8/K1 row + mutation wire map (П6 adapter)

**Assembly:** K8 `1894569a`, K1 `83f279e8`, P2 `9f7c3755` coordinates canonical contract.

## List row: server → UI (`mapReceivingAppealListRowFromWire`)

| Server (K8/K1) | UI (`ReceivingAppealListRow`) |
|----------------|-------------------------------|
| `clientDisplayName` | `clientName` |
| `stageKey` | `stageId` |
| `originKind` | `sourceKey`; `manualEntry` when `manual` |
| `manualSourceKey` | `manualSourceKey` (form channel) |
| `purchaseOrderId` | `purchaseId` |
| `receivingPartnerUserId` | same (+ `receivingPartnerId` alias) |

No blind cast of full row.

## POST manual create: UI → K1 (`toK1ReceivingAppealCreateBody`)

| UI form | K1 JSON |
|---------|---------|
| `clientName` | `clientDisplayName` |
| `manualChannel` | `manualSourceKey` |

## PATCH detail (blocked until P1 allowlist)

| UI `stageId` | K1 wire `stageKey` via `toK1ReceivingAppealPatchBody` |

`isReceivingAppealPatchProxyReady()` — false on current pin; message `RECEIVING_DETAIL_PATCH_BLOCKED`.

## Pagination

- GET returns ≤25 + `nextCursor`; **no** client-only filter on partial page when `serverBackedFilters`.
- Query: `buildReceivingAppealsListQuery`; append via `mergeReceivingAppealPages`.

## Not invented on `83f279e8`

`kpis`, `settings`, `access`, `principal` — omitted until K1 emits.
