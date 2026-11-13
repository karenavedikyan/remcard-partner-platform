# П6 → K1 list consumer — **superseded by `k1-83f279e8-list-envelope.md`**

K1 **`83f279e8`** actual GET: `{ appeals, nextCursor, tab, readOnly }` — not `principal`/`access` yet.

## GET `/api/pro/client-appeals` (no client-invented query scope)

- **Do not** send `branchId` / `organizationId` query params from UI (Root rejected untrusted solo branch-query binding).
- Session + `requireOwnerClientsContext` / list context on server only.

## Expected JSON body (flat; K1 handler)

```json
{
  "appeals": [
    {
      "id": "…",
      "receivingPartnerUserId": "<User.id>",
      "receivingPartnerId": "<same User.id alias>",
      "receivingOrganizationId": null,
      "receivingBranchId": null,
      "referrerPartnerId": "…",
      "clientName": "…",
      "certificateId": "…",
      "stageId": "sys_new",
      "createdAt": "…",
      "updatedAt": "…"
    }
  ],
  "kpis": { "inWork": 0, "paid": 0, "shipped": 0, "conv": "0%" },
  "settings": { "workingStages": [], "refusalReasons": [], "archivedStages": [] },
  "access": {
    "listAllowed": true,
    "mutationsAllowed": true,
    "denialCode": null
  },
  "principal": {
    "receivingPartnerUserId": "<User.id>",
    "receivingOrganizationId": null,
    "receivingBranchId": null
  }
}
```

Optional wrapper: if K1 adds top-level `{ "data": { …above… } }`, П6 `coerceK1ClientAppealsListPayload` unwraps **only** that key (no other envelopes).

## K8 `6f09c23e` alignment (financial read)

- List **KPI strip** (`kpis.*`) — server aggregation only; UI does not recompute from row `paidAmount`.
- Row purchase fields ≠ **bonus payout**; K8 must not project bonus as client purchase total/date (Root bug — K8 owner).
- Row display `paidAmount` / `paidAt` = client purchase projection when present.

## П6 consumer

`fetchReceivingAppealsWorkspace` → `coerceK1ClientAppealsListPayload` + row coercion (`receivingPartnerUserId` required).

**Rights:** `access.mutationsAllowed === true` only enables write UI; default false.
