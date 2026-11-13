# P6 workspace ↔ P5 bulk ↔ K1 batch / per-id PATCH

**P5 dependency (read-only):** `ca2855fb9b470d04b4d7358b74776cefe79a93f8` — not vendored on P6 tip.  
**P6:** `receiving-bulk-contract.ts`, `ReceivingBulkToolbar.tsx`, `ReceivingBulkEditPanel.tsx`, `receiving-bulk-apply.ts`.  
**K1 `a71b8f37`** — batch POST + per-id PATCH `/:id` and `/:id/stage` with `expectedRevision`.

## Connected (P6)

| Control | Flow |
|---------|------|
| `ReceivingBulkActions` toolbar | Mounted from `ReceivingAppealsList` when `readOnly=false` |
| Select all / row checkboxes | Workspace `selected` set |
| `archive` / `trash` / `unarchive` / `restore` | Confirm panel → `postReceivingAppealsBatch` → `normalizeReceivingBatchResponse` → `reload()` |
| Partial batch | `receivingBulkMergeSelection` / `receivingBulkPreserveSelection` |
| `edit-open` | `ReceivingBulkEditPanel` → serial per-id PATCH (notes + non-financial stage), 409 → partial selection |
| `clear` | Clears selection + confirm |

## Blocked until P1

`isReceivingBatchProxyReady()` → `contractState: "blocked"`; confirm disabled; no fake bucket updates.

## Not connected

- Bulk edit form (stage/notes PATCH per id)
- Financial bucket ops
