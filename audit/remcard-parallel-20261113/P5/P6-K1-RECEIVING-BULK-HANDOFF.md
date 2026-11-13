# P6 workspace ↔ K1 batch ↔ П5 `ReceivingBulkActions`

**Refs (user audit):** K1 `51353825`, P6 workspace `5092f756`, P1 proxy `2b2b32b8`, K5 gate `6c444487`. SHAs not merged on partner `origin` at П5 read time — contract from K1 source task.

## K1 HTTP

`POST /api/pro/client-appeals/batch`

**Body (representative):** `{ action: archive|unarchive|trash|restore, ids: string[], ...scope fields TBD by K1 }`

**Response (required consumption):**

```json
{
  "action": "archive",
  "updatedIds": ["…"],
  "skippedIds": ["…"],
  "failures": [{ "id": "…", "code": "…", "reason": "…" }]
}
```

**PATCH scope:** single/multi field edits via `PATCH /api/pro/client-appeals/:id` — triggered by toolbar `edit-open`, **not** batch.

## П5 owned surface

| File | Role |
| --- | --- |
| `ReceivingBulkActions.tsx` | Toolbar UI + `onAction` |
| `receiving-bulk-handoff.ts` | Map UI → K1 action, normalize response, selection merge |

**Not here:** `receiving-appeals-api.ts` (P6/K1), proxy (P1), workspace mount (P6).

## Mounted callbacks (P6 must wire)

```tsx
import { ReceivingBulkActions } from "@/components/clients/receiving/ReceivingBulkActions";
import {
  normalizeReceivingBatchResponse,
  receivingBulkErrorMessage,
  receivingBulkMergeSelection,
  receivingBulkPreserveSelection,
  receivingToolbarToBatchAction,
} from "@/components/clients/receiving/receiving-bulk-handoff";
import { postClientAppealsBatch } from "@/lib/.../receiving-appeals-api"; // P6 only

<ReceivingBulkActions
  bucket={bucket}
  contractState={proxyReady ? (pending ? "pending" : lastError ? "ready" : "ready") : "blocked"}
  partialError={batchPartialMessage}
  selectionOutsideView={selected.size - inViewCount}
  onSelectAll={toggleVisible}
  onAction={(action) => {
    if (action === "clear") {
      setSelected(new Set());
      return;
    }
  const mapped = receivingToolbarToBatchAction(action, bucket);
  if (mapped === "patch-multi") {
    openEditPanel([...selected]);
    return;
  }
  if (!mapped) return;
  setConfirm({ batchAction: mapped, ids: [...selected] });
}}
/>
```

**On confirm (P6):**

1. `setContractState("pending")`
2. `const raw = await postClientAppealsBatch({ action, ids })` (K1 client)
3. `const result = normalizeReceivingBatchResponse(raw)`
4. `setBatchPartial(receivingBulkErrorMessage(result))`
5. If `result.ok` && `result.updatedIds.length` → **`refetchList()`** (required)
6. If `receivingBulkPreserveSelection(result)` → `setSelected(receivingBulkMergeSelection(selected, result))` — **do not** clear failed rows
7. If `!result.ok` → keep confirm panel + selection; no fake local bucket counts
8. On `full` success → close confirm, optional prune selection to `receivingBulkMergeSelection`

## UI ↔ K1 action map

| `ReceivingBulkAction` | Bucket | K1 `action` |
| --- | --- | --- |
| `archive-ask` | active | `archive` |
| `delete-ask` | active | `trash` |
| `unarchive-ask` | archive | `unarchive` |
| `delete-ask` | archive | `trash` |
| `restore-ask` | trash | `restore` |
| `edit-open` | active | **PATCH** (P6 form), not batch |

## vs observer personal

| | Receiving CRM | Observer personal |
| --- | --- | --- |
| API | `client-appeals/batch` | `referred-appeals/personal-batch` |
| Adapter owner | P6/K1 | П5 `observer-personal-api.ts` only |
| Response keys | `updatedIds` / `skippedIds` / `failures` | `processed` / `skipped` |

No AgentClient global delete; no cross-adapter imports.

## P1

Allowlist `POST /api/pro/client-appeals/batch` (+ list/PATCH per matrix) before `contractState: "ready"`.
