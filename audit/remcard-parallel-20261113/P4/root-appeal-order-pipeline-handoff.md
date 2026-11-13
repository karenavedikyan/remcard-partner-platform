# Root handoff — appeal-scoped navigation (P4 exports)

P6/scanner/K1 implement fetch, order-link, and UI; **P4 owns href builders only**.

| Export | Path |
|--------|------|
| `buildReceivingAppealOrderPipelineHref(appealId)` | `/scanner?appealId=…` |
| `receivingAppealReturnHref(appealId)` | `/clients?direction=receiving&appealId=…` |
| `receivingAppealPurchaseDetailHref(orderId, appealId?)` | purchase detail + optional `appealId` |
| `RECEIVING_APPEAL_CONTEXT_QUERY_KEY` | `"appealId"` |

**Host:** pass `navigateTo: (h) => router.push(h)` into `buildReceivingAppealDetailReady` — overrides bare `/scanner` when callbacks omitted.

**Not P4:** `POST …/order-link`, scanner prefill, order creation, return reload after link.
