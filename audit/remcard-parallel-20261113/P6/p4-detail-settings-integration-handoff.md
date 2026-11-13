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

- **Detail controls UI:** `497f313d` — `ReceivingAppealDetailView.tsx` + `receiving-detail-actions-contract.ts` (`buildReceivingAppealDetailReady`).
- **Mapper:** `detail-contract-alignment.ts` — P6+P4 shared; private fields on DTO when not `readOnly`.
- **P6 host:** `ReceivingAppealDetailHost.tsx` → `buildReceivingAppealDetailReady` → `mutateProfile` / `mutateStage` → CAS PATCH in `receiving-appeals-api.ts`; conflict → `reloadDetail`.
- P4 `ReceivingAppealHistory.tsx` remains on branch from earlier assembly; Root replaces from P4 owner tip.

## K1 POST `working-stages` kinds (P6 adapter — confirm vs K1 `51353825`)

`manualChannel`, `addWorkingStage`, `renameWorkingStage`, `archiveWorkingStage`, `restoreWorkingStage`, `moveWorkingStage`, `addRefusalReason`, `renameRefusalReason`, `removeRefusalReason`, `saveSettings`.

409 → `CONFLICT` + refetch settings in editor.

## Remaining / not whole-section

- Source on branch: P1 `0bb25b9b` proxy uses `isAllowedProxyRoute` — batch/detail/PATCH ready in **source**; production deploy pin may still lag (separate from contract).
- Finance UI (P4 contract, P6 host **does not** wire `onOpenPaidReview`): `markPaid.supported === false` with `RECEIVING_MARK_PAID_ABSENT_REASON`; `paidReview.supported === false` with `RECEIVING_PAID_REVIEW_ABSENT_REASON` (`receiving-detail-actions-contract.ts`, missing host callback `onOpenPaidReview`). No profile finance PATCH.
- P1 allowlist for GET detail + PATCH profile/stage + POST working-stages on production pin.
- K8 migration apply — separate DB approval.
- Bulk/list finance — P5 / wallet owners.
