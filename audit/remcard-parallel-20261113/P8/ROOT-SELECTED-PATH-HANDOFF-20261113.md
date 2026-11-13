# Root selected-path handoff (P8 mirror)

**Updated:** 2026-11-13 19:00 UTC · **Supersedes** `3d6c7637` duplicate workaround (corrected @ P6 `4ac14afe`).

## Take (by owner SHA)

| SHA | Include paths (representative) |
|-----|--------------------------------|
| **P5 `1298491f` / lock `99d4c9f0`** | `ReceivingBulkActions.tsx`, `ReceivingBulkEditPanel.tsx`, `ReceivingBulkConfirmPanel.tsx`, `receiving-bulk-handoff.ts` |
| **P4 `497f313d`** | `receiving-detail-actions-contract.ts` (+ Root **sys_paid** copy fix still open) |
| **P1 `0bb25b9b`** (pin in P1 docs `f43f9e22`) | `remcard-proxy.ts` client-appeals + referred-appeals allowlist |
| **P6 `4ac14afe`** | `ReceivingAppealsWorkspace.tsx`, `ClientsDirectionWorkspace.tsx` incoming mount, `ReceivingAppealDetailHost.tsx`, `receiving-bulk-apply.ts`, `receiving-appeals-api.ts` — **imports P5**, no `receiving-bulk-contract.ts` |
| **P3 `67fc52d9`** | `createObserverPersonalPersistenceBridge.ts`, observer list UX |
| **К frozen** | navigator pins unchanged |

## Reject / obsolete

- P6 `3d6c7637` duplicate `receiving-bulk-contract.ts` / toolbar fork — **removed** @ `4ac14afe`
- Whole-branch rejection of P6 — **withdrawn**; only path-level rules above

## Dependency

Root publish order: P5 bulk UI → P6 workspace/host/transport → P1 proxy on integration branch → P3 persistence bridge mounted from parent shell (**P7** chrome optional).

See **`GATE-DELTA-20261113-1900.md`** for release blockers.
