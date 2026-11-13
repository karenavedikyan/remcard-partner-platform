# P6 assembly — import П5 originals only (Root rejected P6 `3d6c7637` vendored copies)

**П5 tip:** `1298491f` · **P6 rejected:** reimplemented `ReceivingBulkActions` / `ReceivingBulkEditPanel` on P6 branch — **delete** and import below.

## Canonical paths (sole writers П5)

| Import path | Symbol(s) |
| --- | --- |
| `@/components/clients/receiving/ReceivingBulkActions` | `ReceivingBulkActions`, `ReceivingBulkActionsProps`, `ReceivingAppealBucket`, `ReceivingBulkAction`, `ReceivingBulkContractState` |
| `@/components/clients/receiving/ReceivingBulkEditPanel` | `ReceivingBulkEditPanel` |
| `@/components/clients/receiving/ReceivingBulkConfirmPanel` | `ReceivingBulkConfirmPanel` |
| `@/components/clients/receiving/receiving-bulk-handoff` | batch + PATCH helpers (no `fetch`) |

**Forbidden on P6 branch:** duplicate files at same paths, `receiving-appeals-api` logic inside handoff, batch-edit route, localStorage.

Observer HTTP: **`@/lib/clients-parity/observer-personal-api`** only (not receiving).

---

## `ReceivingBulkActionsProps` (toolbar)

| Prop | Type | P6 duty |
| --- | --- | --- |
| `bucket` | `active` \| `archive` \| `trash` | workspace filter |
| `contractState` | `blocked` \| `ready` \| `pending` | P1 proxy + in-flight batch/patch |
| `partialError` | `string?` | from `receivingBulkErrorMessage` |
| `selectionOutsideView` | `number` | stale multi-page selection |
| `onSelectAll` | `(checked) => void` | |
| `onAction` | `ReceivingBulkAction` | route panels below |

`ReceivingBulkAction`: `edit-open` \| `archive-ask` \| `delete-ask` \| `unarchive-ask` \| `restore-ask` \| `clear`

---

## Confirm panel

```ts
<ReceivingBulkConfirmPanel
  kind: ReceivingBulkConfirmKind // archive | delete | unarchive | restore
  count: number
  contractState?: ReceivingBulkContractState
  partialError?: string | null
  onCancel={() => void}
  onConfirm={() => void} // P6: POST batch via K1 client
/>
```

Batch action: `receivingConfirmToBatchAction(kind)` → `archive` \| `unarchive` \| `trash` \| `restore` (`delete` → `trash`).

Response: `normalizeReceivingBatchResponse({ action, updatedIds, skippedIds, failures })` then refetch if any `updatedIds`; selection `receivingBulkMergeSelection`.

---

## Edit panel + per-id PATCH (no batch-edit API)

```ts
<ReceivingBulkEditPanel
  count: number
  stageOptions: ReceivingWorkingStageOption[] // { id, label } from P6 list context
  stageBlocked: boolean // prototype financial/refused/return in selection
  contractState?: ReceivingBulkContractState
  saveError?: string | null
  onCancel={() => void}
  onApply={(draft: ReceivingBulkEditDraft) => void} // P6 runs transport
/>
```

**Draft** (`ReceivingBulkEditDraft`):

- `stageId` — empty string = «Не менять»; ignored when `stageBlocked`
- `serviceNote` — trimmed; max 2000 in UI
- `appendNote` — default true (prototype checkbox)

**Intents** — P6 maps body to wire JSON per P2 @ `c49d71dc`:

```ts
buildReceivingBulkPatchIntents(appealIds, draft, {
  stageBlocked,
  stageLockedIds?: Set<string>, // per-row stage lock
  revisions?: Record<appealId, number>, // → expectedRevision on PATCH
})
// → { intents: ReceivingAppealPatchIntent[], validationError? }
```

**`ReceivingAppealPatchBody` (intent payload; P6 `patchClientAppeal` maps field names):**

| Field | Semantics |
| --- | --- |
| `expectedRevision?` | optimistic lock per appeal (from list row revision) |
| `stageId?` | non-financial working stage only; omitted if row in `stageLockedIds` or global `stageBlocked` |
| `serviceNote?` | team note text (prototype `privateNotes` slice) |
| `serviceNoteAppend?` | `true` = append to existing; `false` = replace |

**Stage + note:** `buildReceivingBulkPatchIntents` emits **two** intents per appeal (`part: stage` then `note`). P6 PATCH **in order**; update `expectedRevision` after stage success before note.

**Aggregate partial:**

```ts
const outcomes: ReceivingPatchOutcome[] = []; // per intent, include `part`
const result = aggregateReceivingPatchResults(outcomes);
// receivingBulkShouldRefetch(result) → refetch if any stage/note applied
// receivingBulkMergeSelection keeps row selected when note fails after stage ok
```

On conflict/error: keep panel + draft + failed selection (`preserveUi`).

---

## Batch HTTP (P6 `receiving-appeals-api.ts` only)

Ref pins: K1 `a71b8f37`, P2 `c49d71dc`. П5 does **not** ship HTTP client.

---

## Observer personal (unchanged, separate domain)

`runObserverPersonalConfirmAction`, `applyObserverPersonalEdit`, `patchObserverPersonalMeta` → K5 `referred-appeals/*`. Observer «удалить у себя» ≠ receiving CRM delete.

---

## Client site (К) residual (П5 read-only)

Navigator `89fb8e07` profile published; **Clients pages 5–13** not authorized for publication. Prepared backend pins frozen; partner Clients still blocked without P1 proxy + P3/P6 assembly. **NOT_VERIFIED** UI in browser this turn.
