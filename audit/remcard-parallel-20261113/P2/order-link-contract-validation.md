# Order-link SOURCE contract — P2 read-only validation @ K8 8f4d336a / K1 a71b8f37

**Authorized:** Root glue only (no prod DB, no store API change). **Browser:** NOT_VERIFIED.

## Schema fit (prepared)

| Requirement | Evidence |
| --- | --- |
| Persist association | `PartnerClientAppeal.orderId String? @unique` |
| CAS | `appealRevisionMs(updatedAt)` + `updateMany { updatedAt }` pattern in profile PATCH |
| One order → one appeal | Unique on appeal; `Order.partnerClientAppeal` 1:1 back |
| Purchase projection | `projectAppealPurchaseFields` — paid fields from Order.status only after link |

## Gate reuse

`requireReceivingAppealsWriteContext` + `appealBelongsToReceivingPrincipal` — same as profile/stage. Row scope does not check `deletedAt`; **K8 must add** trash/archive rejection explicitly (risk `RISK-LIFECYCLE-TRASH`).

## Order ↔ appeal scope (K8 must pin)

| Field | Appeal | Order | Note |
| --- | --- | --- | --- |
| Receiving principal | `receivingPartnerUserId` | `proUserId` (likely) | **Must define exact equality rule in K8** |
| Branch | `receivingBranchId?` | `branchId?` | When gate has branch, reject foreign branch orders |
| Certificate | `certificateId?` | `certificateId` (required on Order) | Cert appeals: strict equality; MANUAL: Root scan rule |
| Referrer | `referrerProUserId` | — | **Do not** use for Order authorization |

## Idempotency / steal prevention

- `alreadyLinked` when `appeal.orderId === orderId` before write.
- `409` when appeal linked to different order — never reassign via client.
- `@unique orderId` on appeal prevents binding one order to two appeals; K8 must still verify Order not bound elsewhere if legacy rows exist.

## Financial boundary (unchanged)

Link sets FK only. `paidAmountKopecks` / stage `sys_paid` follow existing `orderCountsAsClientPurchase` + `canTransitionAppealStage` — no client-supplied amounts.

## Owner deliverables

| Owner | Artifact |
| --- | --- |
| K8 | `src/lib/clientAppeals/orderLink.ts` |
| K1 | `POST …/order-link/route.ts` |
| P1 | Allowlist pattern in `CLIENTS_RECEIVING_HTTP_CONTRACT` |
| P4 | `buildReceivingAppealOrderPipelineHref` (P2 ships reference in `types.ts` for parity until P4 lands) |
| P6 | Scanner preflight GET + `postReceivingAppealOrderLink` + retry UI |

P2 inventory: `CLIENTS_RECEIVING_ORDER_LINK_CONTRACT`, wire types in `types.ts`.
