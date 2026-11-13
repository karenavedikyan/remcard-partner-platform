# P4 ↔ P6 mounted detail (residual) @ REM-DUAL-FRONT

## Source pins (origin)

| Owner | SHA | Role |
|-------|-----|------|
| **P4** | `10c25fe6`+ | `ReceivingAppealDetailView`, `detail-contract-alignment`, **`receiving-detail-actions-contract.ts`** |
| **P6 host** | `86251070` | `ReceivingAppealDetailHost` + bridge `receiving-detail-envelope-bridge.ts` |
| **P6 workspace** | `78fd46e7` | Mount host on `view=detail` (replaces placeholder @ `5092`) |
| **K1** | `a71b8f37` | GET detail envelope, profile/stage PATCH |
| **P1** | `2b2b32b8` | Proxy GET/PATCH allowlist |
| **K8** | `8f4d336a` | `ClientAppealRecord` wire |

## Verified GET path (P6)

```
fetchReceivingAppealDetailWire(id)
  → receivingAppealDetailWireToP4Mapped(wire, { readOnly, referrerPartnerName })
  → ReceivingAppealDetailView props (status/history/appeal)
```

**Gap @ `86251070`:** host does **not** pass `actions` (read-only display). Root assembly must use P4 `buildReceivingAppealDetailReady` in host after merge.

## P6 host patch (owned path — **not** done in P4)

```tsx
import { buildReceivingAppealDetailReady } from "@/components/clients/receiving/receiving-detail-actions-contract";
import { patchReceivingAppealProfile, patchReceivingAppealStage } from "@/lib/clients-parity/receiving-appeals-api";

// after wire mapped:
const ready = buildReceivingAppealDetailReady({
  appealId,
  mapped,
  readOnly,
  busy,
  error,
  mutateProfile: async (body) => { /* map 409 → { ok:false, conflict:true } */ },
  mutateStage: async (body) => { /* PATCH …/stage */ },
  reloadDetail: load,
  openPurchaseOrder: mapped.appeal.purchaseOrderId ? () => openOrder(mapped.appeal.purchaseOrderId!) : undefined,
  onOpenPaidReview: undefined, // absent → UI shows RECEIVING_PAID_REVIEW_ABSENT_REASON
});
setViewProps({ ...ready, onBack });
```

### Mutation outcomes

| K1 | P6 maps to | P4 UI |
|----|------------|-------|
| 200 | reload detail | clear `error` |
| 409 stale revision | `{ conflict: true }` + `reloadDetail()` | stage/notes error + «Обновить карточку» (`onConflict`) |
| 403 list-only | `readOnly` on host | no notes/stage sections |

**Profile PATCH:** `privateNotes` (+ optional profile fields K1 allows), **`expectedRevision`** — never `paidAmountKopecks`.

**Stage PATCH:** `stageKey`, optional `refusedReason`, **`expectedRevision`**. **Never** `sys_paid` — K1 `stageRules.ts` → `422 STAGE_REQUIRES_ORDER_PIPELINE`. P4 stage picker excludes `sys_paid`.

**Order pipeline (paid):**

| Callback | Target | Module |
|----------|--------|--------|
| `onOpenOrderPipeline` | `/scanner` | `ScannerHub` (existing sale prep) |
| `onOpenPurchaseOrder` | `/history/purchases/:orderId` | `PurchaseReceivingClientPanel` (read-only view; link write = `PATCH …/receiving-client`, P6) |

## Observer / readOnly

- Receiving list-only / org workplace: `readOnly={true}` on host → **no** `privateNotes` in DTO (`k1ReceivingDetailEnvelopeToP4Mapped(..., { readOnly: true })`).
- Observer drill: **K2** `ObserverClientDetailView` — never receives `privateNotes`/`clientContact`; `publicTimeline` only.

## Paid / shipped (prototype gaps — precise)

| Prototype | Parent callback | Status |
|-----------|-----------------|--------|
| `panel:pay` / pay categories | `onOpenOrderPipeline` / `onOpenPurchaseOrder` | **Absent** on P6 host → order pipeline copy |
| PATCH `sys_paid` | — | **Forbidden** K1; UI excludes from picker |
| `stage:next:sys_shipped` | `shippedConfirm` → stage PATCH | Only if `purchaseOrderId` or `paidAt` on record |
| Purchase «Подробнее» | `onOpenPurchaseOrder` → `/history/purchases/:id` | **Absent** until P6 wires router |

## P6 defects (report only)

- `referrerPartnerName={listRow?.referrerPartnerId}` — passes **User id**, not display name (P6 resolver).

## NOT verified

- Browser mounted flow — **NOT_VERIFIED** (no synthetic UI run this turn).

## Whole Clients

**Not accepted** — bulk panel **P5**, workspace orchestration **P6**, publication **Root** only.
