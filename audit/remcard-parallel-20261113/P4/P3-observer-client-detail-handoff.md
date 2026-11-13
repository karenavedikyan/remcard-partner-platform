# P4 ↔ P3 observer client detail (K2 `c49d71dc`)

**GET** `/api/pro/referred-appeals/:id` → `{ appeal, receivingPartner, timeline, purchase }`.

P3 host fetches; P4 maps with `k2ReferredAppealDetailToReadySlice` and renders:

```tsx
<ObserverClientDetailView
  status="ready"
  {...k2ReferredAppealDetailToReadySlice(wire)}
  backFrom={...}
  onBack={...}
/>
```

| Phase | P4 `status` |
|-------|-------------|
| fetch pending | `loading` |
| 404 | `missing` + `clientId` |
| transport/5xx | `error` + `onRetry` |
| 200 | `ready` — **always** pass `publicTimeline` (may be `[]`) and `purchase` (`null` allowed) |

Legacy list embed (no GET yet) may still omit `publicTimeline` → BLK until P3 wires host.

No `privateNotes`, `clientContact`, or receiving history.
