# P6 ↔ K1 wire map (P2) — Root audit @ P6 `06f7e6bb` vs K1 `83f279e8`

| Constant | Location |
|----------|----------|
| Field maps | `RECEIVING_APPEAL_K1_TO_UI_MAP`, `RECEIVING_MANUAL_POST_UI_TO_K1_MAP`, `RECEIVING_STAGE_PATCH_UI_TO_K1_MAP` |
| List contract | `RECEIVING_K1_P6_LIST_WIRE_CONTRACT` |
| Functions | `types.ts` — `mapReceivingAppealWireToUiRow`, `normalizeK1ReceivingListHttp`, … |

## Row map (every list/detail row)

| K1 wire | P6 UI |
|---------|--------|
| `clientDisplayName` | `clientName` |
| `stageKey` | `stageId` |
| `originKind` | `manualEntry` (`MANUAL` → true) |
| `manualSourceKey` | `sourceKey` |
| `referrerProUserId` | `referrerPartnerId` |
| `receivingPartnerUserId` | `receivingPartnerId` + `receivingPartnerUserId` |
| `purchaseOrderId` | `purchaseId` |
| `paidAmountKopecks` | `paidAmount` |

## Manual POST

P6 sends `clientName` + `manualChannel` → K1 expects `clientDisplayName` + `manualSourceKey` (`mapReceivingUiManualCreateToK1Post`).

## List GET — actual vs P6 mistake

**K1 today:** `{ appeals, nextCursor, tab, readOnly }` (+ `access` when K1 lands).

**Not on list wire:** `settings`, `kpis`, merged `principal` object.

| Load | Route |
|------|--------|
| Rows | `GET /api/pro/client-appeals?limit=&cursor=` |
| Settings | `GET /api/pro/client-appeals/working-stages` → unwrap `{ settings }` |
| KPIs | Page-local derive until K1 server aggregation |

**Pagination:** default `limit=25`; follow `nextCursor` — do not treat first page as full dataset for bulk-all.

## Detail PATCH

| | |
|--|--|
| **Wrong (P6)** | `PATCH /api/pro/client-appeals/:id` |
| **Stage (now)** | `PATCH /api/pro/client-appeals/:id/stage` + `stageKey` |
| **Field patch** | K1 scoped route TBD → P1 allowlist after export |

## P6 owner action

Import mappers from `@/lib/clients-parity/types`; replace `coerceK1ClientAppealsListPayload` fantasy envelope.

Section READY: **false**.
