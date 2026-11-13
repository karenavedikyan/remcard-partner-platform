# K5 / П5 — early interface handoff

## Client module (owned)

`src/lib/clients-parity/observer-personal-api.ts`

| Export | Contract |
| --- | --- |
| `patchObserverPersonalMeta(id, patch)` | `PATCH /api/pro/referred-appeals/:id/personal-meta` |
| `postObserverPersonalBatch(op)` | `POST /api/pro/referred-appeals/personal-batch` |
| `saveObserverPersonalSingle` / `saveObserverPersonalBulkTag` / `moveObserverPersonalBucket` / `restoreObserverPersonal` | Prototype ops; **not** AgentClient |
| `runObserverPersonalConfirmAction` / `applyObserverPersonalEdit` | **P3** orchestration entrypoints |
| `personalMutationRetainSelectedIds` | Keep failed + conflict selection |
| `PersonalMutationResult` | `full` \| `partial` \| `blocked_contract` \| `conflict` \| `error` + `preserveUi` |
| `personalMutationFailedIds` / `personalMutationAppliedIds` | Partial: never clear failed row selection |

## P1 dependency

Add to `remcard-proxy.ts` allowlist (P1 only) — K5 `86ac3e35`:

- `PATCH ^/api/pro/referred-appeals/[\w-]+/personal-meta$`
- `POST ^/api/pro/referred-appeals/personal-batch$`

Until then: client returns `blocked_contract` (403/404).

## P3 dependency

- **Import only** `observer-personal-api.ts` — see `P3-EXPORT-COORDINATION.md`.
- Load `metaById` from list overlays; paginate K2 `items`.
- On success refetch; on partial/conflict **do not** close panel or clear draft; use `personalMutationRetainSelectedIds`.

## Parent list (orchestrator, not П5)

Wire `ObserverPartnersListView` / workspace:

```typescript
persistenceStatus: metaContractReady ? (pending ? "pending" : error ? "error" : "ready") : "blocked"
onSave: (draft) => applyObserverPersonalEdit(panel.mode, panel.ids, draft, versions)
onConfirm: () => runObserverPersonalConfirmAction(panel.action, panel.ids, versions)
selectionOutsideView: selected.size - selectedInView.length
```

Stale selection: prune or hint (prototype filter).

## UI props (already on owned panels)

`ObserverPersonalPersistenceStatus`, `partialError`, `saveError`, `onSave`.

## Receiving bulk (owned)

`src/components/clients/receiving/ReceivingBulkActions.tsx` — props `ReceivingBulkActionsProps` for P6/K1.

Navigator: `POST /api/pro/client-appeals/batch` (no financial actions in this toolbar).

## NOT claimed

- Navigator DB/migrations
- Live proxy routes
- Full Clients section acceptance
