# P4 ↔ P6 receiving detail integration (Root-selected paths only)

**K8 contract (candidate):** `remcard-navigator` @ `6f09c23e` `src/lib/clientAppeals/contract.ts`  
**P6 workspace tip:** `7ebfa955` — list/form/API only; **do not integrate** P6 edits to `ObserverClientDetailView.tsx` / `ObserverPartnersListView.tsx` (P3/P4 owners).

## P4 owned components (sole detail/history UI)

```
src/components/clients/receiving/ReceivingAppealDetailView.tsx
src/components/clients/receiving/ReceivingAppealHistory.tsx
src/components/clients/observer/ObserverPartnerDetailView.tsx
src/components/clients/observer/ObserverClientDetailView.tsx
```

## P6 mount contract

```tsx
import { ReceivingAppealDetailView } from "@/components/clients/receiving/ReceivingAppealDetailView";
import { p6ReceivingDetailToP4Ready } from "@/components/clients/receiving/detail-contract-alignment";

// After fetchReceivingAppealDetail (P6 api) succeeds:
const ready = p6ReceivingDetailToP4Ready(data.appeal, {
  stageLabel: resolvedStageLabel,
  sourceLabel: resolvedSourceLabel,
  referrerPartnerName: resolvedReferrerName,
});
return (
  <ReceivingAppealDetailView
    {...ready}
    onBack={() => setView({ kind: "list" })}
  />
);
```

| Load state | P4 prop |
| --- | --- |
| K1 detail OK | `status: "ready"` via `p6ReceivingDetailToP4Ready` |
| 404 | `status: "missing"` + `appealId` |
| transport/contract blocked | `status: "error"` + `message` + optional `onRetry` |

**Blocked:** `fetchReceivingAppealDetail` failure → keep `ReceivingAppealsBlocked` or error shell — **no** inline fixture history.

## Financial fields (explicit non-display)

P6 `ReceivingAppealDetail` may include `paidAmount`, `paidAt`, `purchaseId` on the wire.  
**P4 detail UI does not render them** until K8 ships a distinct financial projection (bonus payout ≠ client purchase total). Adapter uses `void` discard in `p6ReceivingDetailToP4Ready`.

## Observer (P3 + P4)

- Navigation/load: **P3** `ObserverPartnersListView` + fetch.
- Detail/history: **P4** `ObserverClientDetailView` + `publicTimeline` from **K2** only.
- Partner meta id = `receivingPartnerUserId` after **P2** `types.ts` handoff (pending).

## P2 dependency

When `src/lib/clients-parity/contracts.ts` + `types.ts` land, replace duplicate wire aliases in `detail-contract-alignment.ts` with imports — **P4 does not own those files**.
