# P4 ↔ K1 detail GET envelope (source pins)

| Pin | Role |
|-----|------|
| **K8** `0f4fe833` | `ClientAppealRecord`, `paidAmountKopecks` = client purchase projection |
| **K1** `5a51d7b71f72d665af033b33cfed9bfa5634ed39` | GET detail response + in-tx history |
| **P1** `2b2b32b8` | proxy GET+PATCH allowlist |
| **P6** `4dca7af7` | **owns** `fetchReceivingAppealDetail` JSON parse only |

## K1 GET `/api/pro/client-appeals/:id` body (canonical)

```ts
{
  appeal: ClientAppealRecord; // clientDisplayName, stageKey, referrerProUserId, …
  revision: number;
  history: ClientAppealHistoryEvent[];
  workingStages: { id; label }[];
  refusalReasons: string[];
  principal?: …;
  access?: …;
}
```

**Not** the UI model: `appeal` has no nested `history[]`. P6 must not flatten `paidAmount` rubles — use `paidAmountKopecks`.

## P4 mapper (owned)

`k1ReceivingDetailEnvelopeToP4Mapped(envelope, { referrerPartnerName?, readOnly? })` in  
`src/components/clients/receiving/detail-contract-alignment.ts`

| Wire field | UI |
|------------|-----|
| `clientDisplayName` | `appeal.clientName` |
| `stageKey` | `appeal.stageId` + label from `workingStages` / system map |
| `referrerProUserId` | `referrerPartnerName` via P6 resolver (display lookup) |
| `paidAmountKopecks` | `paidDisplayLabel` via `formatMoneyRub(kopecks/100)` — **client purchase only** |
| `paidAt` | `paidAtDisplay` (when Order timestamp present) |
| top-level `history` | `ReceivingAppealHistory` via `authorLabel` → `author` |

Returns **`revision`**, `workingStages`, `refusalReasons` for P6 stage/notes editors (PATCH `expectedRevision` on profile route; stage on `/:id/stage`).

## P6 mount (fetch adapter — P6 file only)

```tsx
const payload = await remcardFetch<K1ReceivingAppealDetailEnvelopeWire>(path);
const mapped = k1ReceivingDetailEnvelopeToP4Mapped(payload, {
  referrerPartnerName: resolveReferrerName(payload.appeal.referrerProUserId),
  readOnly: access?.mutationsAllowed === false,
});
return (
  <ReceivingAppealDetailView
    status={mapped.status}
    appeal={mapped.appeal}
    history={mapped.history}
    readOnly={mapped.readOnly}
    onBack={…}
  />
);
// retain mapped.revision for PATCH handlers in P6 workspace — not props on P4 view
```

## Writes (K1 — not P4)

| Mutation | Route | Body highlights |
|----------|-------|-----------------|
| Profile / private notes | `PATCH /:id` | `expectedRevision`, profile fields — **no** finance |
| Stage | `PATCH /:id/stage` | `stageKey`, `refusedReason?`, `expectedRevision` |

## Unresolved

- Referrer **display name** lookup (P6 / P2).
- Live navigator on partner host until Root assembles P1+K1+K8.
- Whole Clients section **NOT READY**.
