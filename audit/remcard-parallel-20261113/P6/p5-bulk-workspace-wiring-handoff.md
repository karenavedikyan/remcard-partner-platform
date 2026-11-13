# P6 workspace ↔ P5 bulk ↔ K1 batch

**P5 @ `ca2855fb`** — `ReceivingBulkActions.tsx`, `receiving-bulk-handoff.ts` (vendored, unedited).  
**K1 ref `a71b8f37`** — `POST /api/pro/client-appeals/batch` → `{ updatedIds, skippedIds, failures }`.

## Connected (P6)

| Control | Flow |
|---------|------|
| `ReceivingBulkActions` toolbar | Mounted from `ReceivingAppealsList` when `readOnly=false` |
| Select all / row checkboxes | Workspace `selected` set |
| `archive` / `trash` / `unarchive` / `restore` | Confirm panel → `postReceivingAppealsBatch` → `normalizeReceivingBatchResponse` → `reload()` |
| Partial batch | `receivingBulkMergeSelection` / `receivingBulkPreserveSelection` |
| `edit-open` | Notice only — **PATCH multi panel not built** (P4/P5) |
| `clear` | Clears selection + confirm |

## Blocked until P1

`isReceivingBatchProxyReady()` → `contractState: "blocked"`; confirm disabled; no fake bucket updates.

## Not connected

- Bulk edit form (stage/notes PATCH per id)
- Financial bucket ops
