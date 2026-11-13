# P4 ↔ P6 receiving detail integration (Root-selected paths only)

**K8:** `0f4fe833` · **K1 detail:** `5a51d7b7` · **P1 proxy:** `2b2b32b8` · **P6 adapter tip:** `4dca7af7`

## P4 owned components (sole detail/history UI)

```
src/components/clients/receiving/ReceivingAppealDetailView.tsx
src/components/clients/receiving/ReceivingAppealHistory.tsx
src/components/clients/receiving/detail-contract-alignment.ts
```

## P6 mount contract (K1 envelope)

See `k1-detail-envelope-handoff.md`. P6 **fetch only**; mapping **`k1ReceivingDetailEnvelopeToP4Mapped`**.

| Load state | P4 prop |
| --- | --- |
| K1 detail OK | `status: "ready"` from mapper |
| 404 | `status: "missing"` + `appealId` |
| blocked / transport | `status: "error"` + `onRetry?` |

**No** competing detail component in P6. **No** nested `history` on `appeal` wire.

## Financial display

`paidAmountKopecks` on `ClientAppealRecord` → **client purchase** row in detail (`paidDisplayLabel`). Not partner bonus payout; no formula changes in P4.

## Observer (P3 + P4)

Detail/history for observer drill: **P4** `ObserverClientDetailView` + K2 `publicTimeline` only.
