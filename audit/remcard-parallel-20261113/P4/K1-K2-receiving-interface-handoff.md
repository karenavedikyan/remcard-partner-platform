# P4 receiving detail — K1 / K2 / P6 interface handoff (early)

**Observer export contract:** unchanged — `audit/remcard-parallel-20261113/P4/export-contract-v3.md` @ `eb4592fd`+  
**P2 matrix:** `ac2d4a7b` — `audit/remcard-parallel-20261113/P2/contract-operation-matrix-8137.md` (R1–R8 **Gap** until API)  
**Prototype:** `3dc31836` — `renderDetailPage`, `publicReferrerTimeline`, `isPublicReferrerHistoryEntry`

## Division

| Layer | Owner | Responsibility |
| --- | --- | --- |
| K1 | API/types | `ReceivingAppealDetailDto`, full `history[]`, load/retry from **future** `client-appeals` routes |
| K2 | Projection | Map server history → `referrer-public` lines (prototype rules); **no** `privateNotes` in observer |
| P6 | List/workspace | Mount `ReceivingAppealDetailView`, wire `onBack`, pass load state |
| P4 (this) | UI only | Detail layout + history list; **no** stage PATCH, notes save, bulk |
| P7 | CSS | `ca-detail-*` parity tokens (optional later) |

## K1 DTO (agreed shape — import from P4 until K1 lib exists)

From `ReceivingAppealDetailView.tsx`:

```ts
export type ReceivingAppealHistoryEntry = {
  at: string;
  text: string;
  reason?: string | null;
  author?: string;
};

export type ReceivingAppealDetailDto = {
  id: string;
  clientName: string;
  clientContact?: string | null;
  interest?: string | null;
  stageId: string;
  stageLabel: string;
  certificateId?: string | null;
  referrerPartnerName?: string | null;
  sourceLabel?: string | null;
  updatedAt: string;
};

export type ReceivingAppealDetailReady = {
  status: "ready";
  appeal: ReceivingAppealDetailDto;
  history: ReceivingAppealHistoryEntry[];
  readOnly?: boolean;
};
```

## Component props (P6)

**`ReceivingAppealDetailView`**

```ts
type Props = { onBack: () => void } & (
  | ReceivingAppealDetailReady
  | { status: "missing"; appealId?: string }
  | { status: "error"; message: string; onRetry?: () => void }
);
```

**`ReceivingAppealHistory`**

```ts
type Props = {
  entries: ReceivingAppealHistoryEntry[];
  projection: "receiving-full" | "referrer-public";
  emptyLabel?: string;
  refusedReason?: string | null;
};
```

K2 **must** use `projection="referrer-public"` for observer-safe slices; receiving CRM uses `receiving-full`.

## Blocker (no implementation behind UI)

Until K1 routes exist, P6 should pass `status: "error"` with `BLK-RECEIVING-APPEALS` copy or keep `ReceivingAppealsBlocked` at workspace level — **do not** fabricate `history` from fixtures in product.
