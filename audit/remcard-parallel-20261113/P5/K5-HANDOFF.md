# K5 / П5 — early interface handoff

## Client module (owned)

`src/lib/clients-parity/observer-personal-api.ts`

| Export | Contract |
| --- | --- |
| `patchObserverPersonalMeta(id, patch)` | `PATCH /api/pro/client-appeals/:id/personal-overlay` |
| `postObserverPersonalBatch(op)` | `POST /api/pro/client-appeals/personal-overlay/batch` |
| `saveObserverPersonalSingle` / `saveObserverPersonalBulkTag` / `moveObserverPersonalBucket` | Prototype ops; **not** AgentClient |
| `PersonalMutationResult` | `full` \| `partial` \| `blocked_contract` \| `error` + `preserveUi` |
| `personalMutationFailedIds` | Partial: keep failed row selected |

## P1 dependency

Add to `remcard-proxy.ts` allowlist (P1 only) — aligned K8 `fc33b4fa`:

- `PATCH ^/api/pro/client-appeals/[\w-]+/personal-overlay$`
- `POST ^/api/pro/client-appeals/personal-overlay/batch$`

Until then: client returns `blocked_contract` (403/404).

## P3 dependency

- Load `metaById` from referred list response or dedicated GET.
- On success refetch appeals + meta; on partial merge `metaById` and pass `selectionOutsideView`, `saveError`, `persistenceStatus`.

## Parent list (orchestrator, not П5)

Wire `ObserverPartnersListView` / workspace:

```typescript
persistenceStatus: metaContractReady ? (pending ? "pending" : error ? "error" : "ready") : "blocked"
onSave: (draft) => run saveObserverPersonalSingle / saveObserverPersonalBulkTag
onConfirm: () => run moveObserverPersonalBucket(..., kindToBucket)
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
