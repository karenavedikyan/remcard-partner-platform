# P6 workspace ↔ K1 batch ↔ П5 `ReceivingBulkActions`

**Refs:** K1 `a71b8f37`, P2 PATCH types `c49d71dc`, P6 workspace `78fd46e7` (not on partner `origin` at П5 read). **П5 @ tip** owns panels + handoff; P6 must not vendor copies.

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
| `ReceivingBulkActions.tsx` | Toolbar + `edit-open` |
| `ReceivingBulkEditPanel.tsx` | Prototype bulk edit (stage + service note) |
| `ReceivingBulkConfirmPanel.tsx` | archive/delete/unarchive/restore confirm |
| `receiving-bulk-handoff.ts` | batch + **per-id PATCH intents** + selection merge |

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
    setBulkPanel("edit");
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
| `edit-open` | active | **`ReceivingBulkEditPanel`** → per-id `PATCH` (P6 transport), not batch |

## Bulk edit (per-id PATCH, P6 transport)

```tsx
import { ReceivingBulkEditPanel } from "@/components/clients/receiving/ReceivingBulkEditPanel";
import {
  aggregateReceivingPatchResults,
  buildReceivingBulkPatchIntents,
  receivingBulkMergeSelection,
} from "@/components/clients/receiving/receiving-bulk-handoff";
import { patchClientAppeal } from ".../receiving-appeals-api"; // P6 only

{bulkPanel === "edit" ? (
  <ReceivingBulkEditPanel
    count={selected.size}
    stageOptions={workingStageOptions}
    stageBlocked={selectionHasFinancialStage}
    contractState={batchContractState}
    saveError={editError}
    onCancel={() => setBulkPanel(null)}
    onApply={async (draft) => {
      const { intents, validationError } = buildReceivingBulkPatchIntents([...selected], draft, {
        stageBlocked,
        stageLockedIds,
        revisions,
      });
      if (validationError) {
        setEditError(validationError);
        return;
      }
      setBatchContractState("pending");
      const outcomes = await Promise.all(
        intents.map(async ({ appealId, body }) => {
          try {
            await patchClientAppeal(appealId, body);
            return { appealId, ok: true as const };
          } catch (e) {
            return { appealId, ok: false as const, reason: "patch_failed", message: String(e) };
          }
        }),
      );
      const result = aggregateReceivingPatchResults(outcomes);
      setEditError(receivingBulkErrorMessage(result));
      if (result.ok) await refetchList();
      if (receivingBulkPreserveSelection(result)) {
        setSelected(receivingBulkMergeSelection([...selected], result));
      }
      if (result.ok && result.kind === "full") setBulkPanel(null);
      setBatchContractState("ready");
    }}
  />
) : null}
```

```tsx
import { ReceivingBulkConfirmPanel } from "@/components/clients/receiving/ReceivingBulkConfirmPanel";
import { receivingConfirmToBatchAction } from "@/components/clients/receiving/receiving-bulk-handoff";

{bulkConfirm ? (
  <ReceivingBulkConfirmPanel
    kind={bulkConfirm}
    count={selected.size}
    contractState={batchContractState}
    partialError={batchPartialMessage}
    onCancel={() => setBulkConfirm(null)}
    onConfirm={() => runBatch(receivingConfirmToBatchAction(bulkConfirm))}
  />
) : null}
```

## vs observer personal

| | Receiving CRM | Observer personal |
| --- | --- | --- |
| API | `client-appeals/batch` | `referred-appeals/personal-batch` |
| Adapter owner | P6/K1 | П5 `observer-personal-api.ts` only |
| Response keys | `updatedIds` / `skippedIds` / `failures` | `processed` / `skipped` |

No AgentClient global delete; no cross-adapter imports.

## P1

Allowlist `POST /api/pro/client-appeals/batch` (+ list/PATCH per matrix) before `contractState: "ready"`.
