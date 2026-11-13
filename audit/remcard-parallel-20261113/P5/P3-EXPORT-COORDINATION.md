# P3 ↔ P5 — sole adapter + orchestration (tip owns `observer-personal-api.ts`)

**Rule:** P3 imports **only** from `@/lib/clients-parity/observer-personal-api`. Do not duplicate fetch paths or types on the P3 branch.

## Canonical module

`src/lib/clients-parity/observer-personal-api.ts`

Refs: K5 routes `K5_NAVIGATOR_CONTRACT_REF` (86ac3e35), gate `K5_NAVIGATOR_GATE_REF` (6c444487), K8 identity `K8_RECEIVING_IDENTITY_REF` (6f09c23e).

## High-level callbacks (wire in workspace/list)

| UI event | Call | Notes |
| --- | --- | --- |
| Edit save | `applyObserverPersonalEdit(mode, ids, draft, { expectedVersion, expectedVersions })` | bulk = **tag only** (`setTag`) |
| Confirm archive | `runObserverPersonalConfirmAction("archived", ids, opts)` | |
| Confirm self-delete | `runObserverPersonalConfirmAction("trash", ids, opts)` | from **active or archived**; trash tab is restore-only |
| Confirm restore | `runObserverPersonalConfirmAction("restore", ids, opts)` | from **archived or trash** → `active` |

Low-level: `patchObserverPersonalMeta`, `postObserverPersonalBatch`, `saveObserverPersonalSingle`, `saveObserverPersonalBulkTag`, `moveObserverPersonalBucket`, `restoreObserverPersonal`.

## `expectedVersions`

Build from list overlay after each successful refetch: `Record<appealId, meta.version>` from K5 projection / P2 `ObserverPersonalMeta` extension if P2 adds `version`.

## Result handling (do not reset user context on failure)

```typescript
const result = await runObserverPersonalConfirmAction(kind, ids, { expectedVersions });

setPersistenceStatus(result.ok ? "ready" : result.kind === "blocked_contract" ? "blocked" : "error");
setPartialError(personalMutationErrorMessage(result));

if (!result.ok && personalMutationPreserveSelection(result)) {
  // Keep panel open, selection, edit draft — no setPanel(null), no clear draft initial
  setSelected(new Set(personalMutationRetainSelectedIds([...selected], result)));
  return;
}

if (result.ok) {
  mergeMeta(result.metaById);
  const applied = personalMutationAppliedIds(result);
  const failed = personalMutationFailedIds(result);
  setSelected((prev) => {
    const next = new Set(prev);
    for (const id of applied) next.delete(id);
    for (const id of failed) next.add(id);
    return next;
  });
  if (result.kind === "full" && failed.length === 0) setPanel(null);
  await refetchListAndOverlays();
}
```

- **Conflict (`409`):** `preserveUi: true` — show message, keep selection + draft; refetch list for fresh `version`.
- **Partial batch:** keep failed ids selected; show `partialError` on confirm/edit panel.
- **Proxy blocked:** `blocked_contract` → `persistenceStatus: "blocked"`; no localStorage / fake meta.

## Trash / restore UX (owned toolbar, P3 passes handlers)

| Bucket | Toolbar | Confirm kind |
| --- | --- | --- |
| `active` | archive + trash + edit | `archived` / `trash` |
| `archived` | restore + trash + edit | `restore` / `trash` |
| `trash` | **restore only** (no edit, no self-delete) | `restore` |

K5 `BUCKET_LOCKED` when mutating from trash except restore — map to `error` + `preserveUi`.

## Not P5 / not P3 adapter

- List pagination K2 `{ items, page, limit, total, hasMore }` — P3 fetch only.
- Receiving partner labels: `receivingPartnerUserId` (User.id); do not require Branch for solo specialists.
- P1 proxy allowlist — see `K5-HANDOFF.md`.

## Competing copy

If a P3-branch duplicate of this adapter exists, **delete it** and point imports here before Root integration.

## Edit / confirm draft binding (required props @ `f2e51a00+`)

`observer-personal-edit-target.ts`: `buildObserverEditTargetKey`, `buildObserverConfirmTargetKey`, `ObserverPersonalEditPanelBinding`.

- `editTargetKey` / `confirmTargetKey` — stable sorted ids; remount with `key={editTargetKey}`.
- `draftSeed` — increment **only** on cancel/reopen; keep constant across `ready→pending→error` so user draft survives.
- `onSave` / `onConfirm` fire on **`ready` and `error`** (retry); **`pending`** is no-op.
- Do not replace `initial` each render to reset draft — that discards user input; bump `draftSeed` instead.
