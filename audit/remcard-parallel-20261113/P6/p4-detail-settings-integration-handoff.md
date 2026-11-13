# P6 — P4 detail mount + settings editor (source-only)

## Early contract handoff

| Piece | Owner | P6 action |
|-------|-------|-----------|
| Detail UI | P4 @ `789bacfe` | Mount `ReceivingAppealDetailView` via `ReceivingAppealDetailHost` |
| Wire → P4 props | P4 `k1ReceivingDetailEnvelopeToP4Mapped` | P6 bridge `receiving-detail-envelope-bridge.ts` (no list-row cast) |
| GET detail | K1 + P1 | `fetchReceivingAppealDetailWire` → loading / missing / error / ready |
| Settings UI | P6 `WorkingStagesEditor` | Prototype add/rename/archive/restore + reasons |
| Settings POST | K1 `51353825` | `postReceivingWorkingStagesMutation` kinds + `expectedVersion` |
| Notes/stage PATCH on detail | P6 host + P4 UI @ `10c25fe6` | `ReceivingAppealDetailHost` → `patchReceivingAppeal*Cas`; finance actions frozen |

## HTTP / transport (P6 only)

All K1 fetch/PATCH clients: `src/lib/clients-parity/receiving-appeals-api.ts`  
Detail CAS helpers: `patchReceivingAppealProfileCas`, `patchReceivingAppealStageCas`, `fetchReceivingAppealDetailWire`.

## P4 UI dependency (read-only SHA)

- **Detail controls UI:** `6b7c38d3` — `ReceivingAppealDetailView.tsx` + `receiving-detail-actions-contract.ts` (finance = navigation only; K1 `STAGE_REQUIRES_ORDER_PIPELINE`). P6 does **not** commit P4 copies.
- **P6 host wiring:** `receiving-detail-host-wiring.ts` + `ReceivingAppealDetailHost.tsx` → `onOpenOrderPipeline` → `/scanner`; `openPurchaseOrder` → `receivingAppealPurchaseDetailHref(purchaseOrderId)` when mapped id present.
- **Mapper:** `detail-contract-alignment.ts` — P6+P4 shared; private fields on DTO when not `readOnly`.
- **P6 host:** CAS `mutateProfile` / `mutateStage` only (non-finance). No PATCH mark-paid; no invented `receiving-client` PATCH from detail.
- P4 `ReceivingAppealHistory.tsx` remains on branch from earlier assembly; Root replaces from P4 owner tip.

## K1 POST `working-stages` kinds (P6 adapter — confirm vs K1 `51353825`)

`manualChannel`, `addWorkingStage`, `renameWorkingStage`, `archiveWorkingStage`, `restoreWorkingStage`, `moveWorkingStage`, `addRefusalReason`, `renameRefusalReason`, `removeRefusalReason`, `saveSettings`.

409 → `CONFLICT` + refetch settings in editor.

## Remaining / not whole-section

- Source on branch: P1 `0bb25b9b` proxy uses `isAllowedProxyRoute` — batch/detail/PATCH ready in **source**; production deploy pin may still lag (separate from contract).
- Finance: host wires `onOpenOrderPipeline` / `openPurchaseOrder` (read-only deps @ P4 `6b7c38d3`); `readOnly` → no actions (observer/agent rules unchanged).
- P1 allowlist for GET detail + PATCH profile/stage + POST working-stages on production pin.
- K8 migration apply — separate DB approval.
- Bulk/list finance — P5 / wallet owners.
