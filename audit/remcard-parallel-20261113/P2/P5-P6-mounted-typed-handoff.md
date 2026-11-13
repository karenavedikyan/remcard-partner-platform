# P5 / P6 typed handoff (P2 inventory @ mounted tips)

**Do not duplicate HTTP clients** — single fetch surface: `receiving-appeals-api.ts` (P6). P5 owns toolbar + pure transforms only.

## Batch (lifecycle)

```ts
import {
  postReceivingAppealsBatch,
  type ReceivingAppealsBatchResponseWire,
} from "@/lib/clients-parity/receiving-appeals-api";
import {
  normalizeReceivingBatchResponse,
  receivingBulkErrorMessage,
  receivingBulkMergeSelection,
  receivingToolbarToBatchAction,
} from "@/components/clients/receiving/receiving-bulk-handoff";
import { mapK1BatchHttpForP5Normalize } from "@/lib/clients-parity/types";

const requested = "archive" as const;
const res = await postReceivingAppealsBatch({ action: requested, ids });
if (!res.ok) { /* BLOCKED_CONTRACT until P1 */ return; }
const normalized = normalizeReceivingBatchResponse(
  mapK1BatchHttpForP5Normalize(requested, res.data),
);
```

K1 wire **omits** `action` — always inject `requested` before P5 normalize.

## Detail (non-financial PATCH)

P4 `ReceivingAppealDetailActions` @ `10c25fe6`:

- `onSavePrivateNotes` → `PATCH /client-appeals/:id` `{ privateNotes, expectedRevision }`
- `onApplyStage` → `PATCH /client-appeals/:id/stage` `{ stageKey, refusedReason?, expectedRevision }`
- `markPaid.supported: false` — stage/order flows unchanged

Profile allowed fields: `RECEIVING_NONFINANCIAL_PATCH_CONTRACT` in `contracts.ts`.

## Bulk edit (not batch)

`edit-open` → `patch-multi` — **serial per-id PATCH**, not `ReceivingAppealsBatchBody.patch`.  
K1 `bulk-edit` batch is a **separate** server action (`GAP-K1-BATCH-BULK-EDIT`).

## Manual channels

`POST working-stages` `{ kind: "manualChannel", label, expectedVersion }` → validate create `manualSourceKey` against `settings.manualChannels` + builtins (not `scan` on manual POST).
