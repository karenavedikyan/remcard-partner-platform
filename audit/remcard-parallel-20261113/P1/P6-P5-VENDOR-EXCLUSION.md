# P6 — exclude P5 bulk duplicates from P6 ownership

Superseded detail: **`P5-P6-BULK-COLLISION-MAP.md`**.

Root **rejects** P6 whole tip `3d6c7637` (duplicate `ReceivingBulkToolbar`, `receiving-bulk-contract`, collision on `ReceivingBulkEditPanel` vs P5 `1298491f`).

## P5 canonical @ `1298491f`

Toolbar, edit, confirm, helpers — **P5 blobs only** (see collision map).

## Exclude from any P6 bundle (never publish as P6-owned)

- `ReceivingBulkActions.tsx`, `receiving-bulk-handoff.ts` (legacy @ `78fd46e7` vendoring)
- `ReceivingBulkToolbar.tsx`, `ReceivingBulkEditPanel.tsx` (@ `3d6c7637` duplicates)
- `receiving-bulk-contract.ts`

## P6-owned @ 78fd46e7 (receiving workspace)

- `ReceivingAppealsWorkspace.tsx`, `ReceivingAppealsList.tsx`, `ReceivingBulkActions` **mount site** only via import
- `src/lib/clients-parity/receiving-appeals-api.ts` — **P6/P2 coordination** (not P1); P1 only documents proxy gates

## P5 observer personal (unchanged ownership)

Still `src/components/clients/observer/ObserverPersonal*.tsx` @ P5 tip — not part of 78fd46e7 receiving bulk vendoring.
