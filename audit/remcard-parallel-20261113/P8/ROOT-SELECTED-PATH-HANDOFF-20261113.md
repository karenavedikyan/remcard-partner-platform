# Root selected-path handoff (P8 mirror)

**Date:** 2026-11-13 REM-DUAL-FRONT correction  
**Rule:** File-owner wins; reject P6 duplicate of P5 at same path.

## Take (by owner SHA)

| SHA | Include paths (representative) |
|-----|--------------------------------|
| **P5 `1298491f`** | `ReceivingBulkActions.tsx`, `ReceivingBulkEditPanel.tsx`, `ReceivingBulkConfirmPanel.tsx`, `receiving-bulk-handoff.ts` |
| **P4 `497f313d`** | `receiving-detail-actions-contract.ts`, `ReceivingAppealDetailView.tsx` (actions) |
| **P1 `0bb25b9b`** | `remcard-proxy.ts` Clients allowlist (batch, detail PATCH, stage, settings) |
| **P6 `3d6c7637`** | `ReceivingAppealsWorkspace.tsx`, `ReceivingAppealDetailHost.tsx`, `receiving-bulk-apply.ts`, `receiving-appeals-api.ts` (transport), `ClientsDirectionWorkspace.tsx` mount — **exclude** duplicate bulk UI/contract paths |
| **К frozen** | navigator pins unchanged |

## Reject from P6 `3d6c7637` (keep P5 originals instead)

- `src/lib/clients-parity/receiving-bulk-contract.ts` (use P5 handoff)
- `src/components/clients/receiving/ReceivingBulkToolbar.tsx` (use P5 `ReceivingBulkActions.tsx`)
- `src/components/clients/receiving/ReceivingBulkEditPanel.tsx` when content ≠ P5 `1298491f`

## Dependency

P6 workspace must import P5 panels/handoff + P6 `applyReceivingBulkEditsPerId` after Root merge order.
