# Root order-link glue contract (SOURCE — P1 proxy pin)

**Authorized:** implementation prep glue only — **no** DB/migrate/deploy, **no** store order API changes.

## Partner proxy (P1)

| Method | Path |
|--------|------|
| POST | `/api/pro/client-appeals/:id/order-link` |

Same reserved-id guardrails as detail (`batch`, `working-stages`, `certificate-entry`).

## Navigator owners (do not implement in partner repo)

| Owner | Deliverable |
|-------|-------------|
| **K8** | `src/lib/clientAppeals/orderLink.ts` → `linkReceivingAppealOrder(...)` |
| **K1** | `POST .../[id]/order-link` body `{orderId, expectedRevision}`; receiving WRITE gate; typed errors |
| **P4** | `buildReceivingAppealOrderPipelineHref` → `/scanner?appealId=`; `receivingAppealReturnHref` → `/clients?direction=receiving&appealId=` |
| **P6** | Direction workspace reads `appealId` query; scanner→order→link UX; retry **order-link only** |

## Contract summary

1. Store order creation **unchanged**.
2. After validated store success: `POST order-link` with CAS `expectedRevision`; one tx link + history.
3. Certificate on appeal must match order when appeal is certificate-bound.
4. Same `orderId` retry idempotent (`alreadyLinked`).
5. Response `200 {appealId, orderId, revision, alreadyLinked}`; errors `{error, code}` 400/401/403/404/409.
6. Never trust client paid/amount/stage; authoritative order recognition on server.

## UI pins (Root)

P1 `f43f9e22`+ proxy; P4/P6 selected pins in `selected-source-manifest.p1-reconcile.json`.

Backend frozen: K8 `8f4d336a`, K1 `a71b8f37`, K2 `c49d71dc`, K5 `6c444487`.
