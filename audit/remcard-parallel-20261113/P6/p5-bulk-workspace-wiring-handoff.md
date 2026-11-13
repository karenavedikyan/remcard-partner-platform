# P6 ↔ P5 bulk — ownership correction (reverts `3d6c7637` workaround)

## Root decision

Renaming/reimplementing P5 modules on the same paths is **rejected**. P5 sole sources @ **`1298491f7e8a86b6462ede9e42cf9513b691e8d1`**:

- `ReceivingBulkActions.tsx`
- `ReceivingBulkEditPanel.tsx`
- `ReceivingBulkConfirmPanel.tsx`
- `receiving-bulk-handoff.ts`

## Root packaging — **INCLUDE** (from P5 tip / `1298491f`)

```
src/components/clients/receiving/ReceivingBulkActions.tsx
src/components/clients/receiving/ReceivingBulkEditPanel.tsx
src/components/clients/receiving/ReceivingBulkConfirmPanel.tsx
src/components/clients/receiving/receiving-bulk-handoff.ts
src/components/clients/receiving/P5.receiving-bulk-handoff.test.tsx
```

## Root packaging — **EXCLUDE / DELETE** (P6 `3d6c7637` collisions)

```
src/components/clients/receiving/ReceivingBulkToolbar.tsx
src/lib/clients-parity/receiving-bulk-contract.ts
```

Any local `ReceivingBulkEditPanel.tsx` / `receiving-bulk-handoff.ts` content that is **not** byte-identical to P5 `1298491f`.

## P6-owned (wire only)

- `ReceivingAppealsWorkspace.tsx` — imports P5 panels + handoff normalizers; `isReceivingBatchProxyReady()` for contract state (P1 `0bb25b9b` allows batch when `isAllowedProxyRoute` true on this branch).
- `ReceivingAppealsList.tsx` — mounts `ReceivingBulkActions` (not toolbar duplicate).
- `src/lib/clients-parity/receiving-bulk-apply.ts` — serial PATCH transport via P5 intents only. CAS: P5 `body.expectedRevision` vs initial GET → `RECEIVING_BULK_EXPECTED_REVISION_CONFLICT` before writes (no silent revision swap). Note snapshot single-wire rule; `stageApplied` + `receivingBulkApplyNeedsListReload` for workspace partial refresh. `isReceivingFinancialStageKey` includes RETURN (K1 bulk allowlist). No auto-retry.
- `ReceivingAppealsWorkspace.tsx` — `executeBulkEdit` reloads when any outcome `ok || stageApplied`.
- `src/lib/clients-parity/receiving-appeals-api.ts` — batch + CAS PATCH (unchanged owner).

Branch may carry P5 files as **read-only mirror** for compile; Root replaces from P5 owner — P6 must not edit those paths.
