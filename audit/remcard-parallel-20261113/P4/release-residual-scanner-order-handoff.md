# P4 release residual — scanner / purchase handoff (honest)

**Assembly pins (Root prep):** P4 `9d22694f`, P6 `2375944e`, prototype `3dc31836`, backend frozen (K8 `8f4d336a`, K1 `a71b8f37`).

**Deep gap (next-step / inline pay vs scanner):** `prototype-next-step-inline-pay-gap.md` — **BLOCKED_CONTRACT** on appeal/scanner/return context.

## What P4 detail does today

| Prototype affordance | User copy | Host wiring @ `d364a53c` |
|---------------------|-----------|---------------------------|
| «Сохранить» notes | placeholder «Только для вашей команды» | profile save + refresh (P6 defect if stale after save) |
| «Отметить оплату» | opens order pipeline when callback set | `onOpenOrderPipeline` → `/scanner` **or** purchase history |
| «Подробнее о покупке» | when `purchaseOrderId` + callback | `/history/purchases/:orderId` |
| «Отметить отгрузку» | on `sys_paid` when paid projection exists | stage PATCH `sys_shipped` (allowed by K1 when paid) |

Direct **PATCH `sys_paid`** is excluded in UI (K1 `STAGE_REQUIRES_ORDER_PIPELINE`).

## REAL scanner residual (not a completed payment journey)

1. **`/scanner` (`ScannerHub.tsx`)** has **no** `appealId`, **no** `certificateId`, **no** `returnTo` appeal context in partner routes (`master-nav` / `agent-nav` → plain `/scanner`).
2. **Certificate → appeal** on Clients uses **`POST /api/pro/client-appeals/certificate-entry`** from receiving workspace scan — **not** deep-link from detail «Отметить оплату» into scanner with promo prefill.
3. **After checkout** in scanner there is **no proven** navigation back to the same **`ReceivingAppealDetailView`** with order linked to appeal (`purchaseOrderId` on `ClientAppealRecord` is K8/order projection — not wired from scanner return URL in partner UI).
4. **Safe mapping that exists today:**
   - `purchaseOrderId` already on appeal → `receivingAppealPurchaseDetailHref` + `PurchaseReceivingClientPanel` (read view; link write = store order PATCH, outside P4).
   - Empty `purchaseOrderId` → only generic `/scanner` entry (same as wallet empty CTA) — **association with this appeal not guaranteed**.

## P6-owned (reported, not P4)

- Revision stamp, double-JSON body, refresh notice @ host `2375944e` (Root verified synthetically).
- Appeal↔scanner context contract (if ever approved) — navigation + scanner state, not P4 UI redesign.

## Not whole-section / not FINISHED

Observer list (P3/K2), bulk (P5), settings editor, prod proxy+migration, full prototype pay-category review inline panel.
