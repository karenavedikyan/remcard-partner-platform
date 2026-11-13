# P6 — P4 detail mount + settings editor (source-only)

## Early contract handoff

| Piece | Owner | P6 action |
|-------|-------|-----------|
| Detail UI | P4 @ `789bacfe` | Mount `ReceivingAppealDetailView` via `ReceivingAppealDetailHost` |
| Wire → P4 props | P4 `k1ReceivingDetailEnvelopeToP4Mapped` | P6 bridge `receiving-detail-envelope-bridge.ts` (no list-row cast) |
| GET detail | K1 + P1 | `fetchReceivingAppealDetailWire` → loading / missing / error / ready |
| Settings UI | P6 `WorkingStagesEditor` | Prototype add/rename/archive/restore + reasons |
| Settings POST | K1 `51353825` | `postReceivingWorkingStagesMutation` kinds + `expectedVersion` |
| Notes/stage PATCH on detail | P4 follow-up | **Out of scope** this turn — P4 owns controls; host is read-only display |

## P4 paths vendored for compile (Root assembly)

Unmodified from `origin/cursor/remcard-p4-acceptance-20261113` @ `789bacfe`:

- `ReceivingAppealDetailView.tsx`
- `ReceivingAppealHistory.tsx`
- `detail-contract-alignment.ts`

P6 did not edit P4 UI logic. Root may replace with P4 tip at merge.

## K1 POST `working-stages` kinds (P6 adapter — confirm vs K1 `51353825`)

`manualChannel`, `addWorkingStage`, `renameWorkingStage`, `archiveWorkingStage`, `restoreWorkingStage`, `moveWorkingStage`, `addRefusalReason`, `renameRefusalReason`, `removeRefusalReason`, `saveSettings`.

409 → `CONFLICT` + refetch settings in editor.

## Remaining / not whole-section

- P4 detail **write** controls (notes, stage picker, refusal panel) — separate P4 task; props not wired until P4 lands controls.
- P1 allowlist for GET detail + POST working-stages on production pin.
- K8 migration apply — separate DB approval.
- Bulk/list finance — P5 / wallet owners.
