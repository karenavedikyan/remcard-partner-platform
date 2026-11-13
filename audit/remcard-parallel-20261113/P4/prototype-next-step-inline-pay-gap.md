# P4 — prototype next-step / inline pay vs order pipeline (acceptance gap)

**Not whole-section acceptance.** Root UI pins (prep only): P1 `f43f9e22`, P2 `457a417c`, P3 `b1c1684e`, P4 `9d22694f`, P5 `164b8dbe`, P6 `2375944e`, P7 `9094f523`. Prototype frozen **`3dc31836`** (`partner/client-appeals.js`).

Root re-verified mounted receiving detail @ P6 `2375944e` with **original** `receiving-appeals-api` / `remcardFetch` on **intercepted synthetic routes** (no real backend, no payment): revision 1→2 on two saves, stage/history refresh, draft retained on failed save, truthful notice when save OK but refresh failed, 409 reload without auto-retry write, read-only redaction, 404/back/500/retry, **scanner/order buttons invoke router**. That does **not** prove prototype pay-panel parity or a completed payment journey.

---

## Prototype control / state map (`3dc31836`)

| Prototype surface | Prototype state / action | Product meaning |
|-------------------|--------------------------|-----------------|
| `renderDetailPage` | Page shell: fields, history, notes, purchase side | P4 `ReceivingAppealDetailView` |
| `renderNextStepCard` | **In-page** next-step: stage picker, refusal, **opens pay panel** (`panel:pay`) | P4 `ReceivingAppealStageControls` + purchase section — **no pay panel** |
| `renderPurchaseSideCard` | Purchase summary, categories, amounts, «Подробнее» when order exists | P4 «Покупка» block: projection rows + one CTA |
| Pay panel (`panel:pay`) | Category/totals/confirm **on the same detail route**; success updates appeal purchase fields | **Absent** — replaced by navigation |
| `stage:next:sys_shipped` | Shipped after paid projection | P4 `shippedConfirm` → K1 stage PATCH (not order pipeline) |
| Paid stage | Via **order + projection**, not CRM PATCH `sys_paid` | K1 `STAGE_REQUIRES_ORDER_PIPELINE`; P4 excludes `sys_paid` from picker |

Prototype pages **111 «Покупка в обращении»** and matrix **C22–C24** (форма/черновик/подтверждение покупки) remain **BLOCKED** at contract inventory level (`BLK-RECEIVING-APPEALS` in `contracts.ts`) even when list/detail APIs are exercised synthetically — inline pay is a **UI/state** gap, not a missing label.

---

## P4 implemented mapping (tip `9d22694f`)

| User affordance | P4 UI | P4 action contract field | K1 rule |
|-----------------|-------|---------------------------|---------|
| Заметки | `ca-receiving-detail-notes` | `onSavePrivateNotes` | profile PATCH + `expectedRevision` |
| Следующий шаг (этап) | `ca-receiving-detail-stage` | `onApplyStage`, `refusalReasons` | stage PATCH; **no** `sys_paid` |
| Отметить отгрузку | `ca-receiving-mark-shipped` | `shippedConfirm` | `sys_shipped` when paid projection |
| Покупка / «Отметить оплату» | `ca-receiving-purchase-panel` | `paidReview` / `markPaid` | **no** appeal PATCH for paid |
| Подробнее о покупке | `ca-receiving-purchase-open` | `onOpenPurchaseOrder` | navigation only |
| Нет order id | «Отметить оплату» | `onOpenOrderPipeline` (via builder) | navigation only |

Builder: `buildReceivingAppealDetailReady` in `receiving-detail-actions-contract.ts` — **no fetch**, no router.

---

## P6 interface evidence @ `2375944e` (read-only; same contract P4 owns)

```text
onOpenOrderPipeline  → router.push(RECEIVING_APPEAL_ORDER_PIPELINE_HREF)  // "/scanner"
openPurchaseOrder    → router.push(receivingAppealPurchaseDetailHref(orderId))
                     // only when appeal.purchaseOrderId present
buildReceivingAppealDetailReady({ …, onOpenOrderPipeline, openPurchaseOrder })
```

| Condition | `paidReview` / `markPaid` | Navigation |
|-----------|---------------------------|------------|
| `readOnly` | unsupported (no actions) | — |
| No `purchaseOrderId`, writable | supported → **same** `onOpenOrderPipeline` | bare `/scanner` |
| `purchaseOrderId` set | `onOpenPurchaseOrder` → purchase detail | `/history/purchases/:orderId` |

Post-mutation: `afterSuccessfulMutation` → `refreshMappedDetail`; 409 → `reloadDetail` + P4 «Обновить карточку»; optional `detailRefreshNotice` when refresh fails after successful save (P6 host).

**P4 does not** implement router, double-JSON body fix, or revision stamping — documented here for mount acceptance only.

---

## Supported order-pipeline contract (smallest approved integration)

Already the **only** P4-approved handoff (no new APIs, no paid-stage PATCH):

1. **`RECEIVING_ORDER_PIPELINE_CALLBACK`** (`onOpenOrderPipeline`) → **`RECEIVING_APPEAL_ORDER_PIPELINE_HREF`** (`/scanner`).
2. **`RECEIVING_PURCHASE_PANEL_CALLBACK`** (`onOpenPurchaseOrder`) → **`receivingAppealPurchaseDetailHref(orderId)`**.
3. Optional downstream (not P4): `PATCH /api/store/orders/:id/receiving-client` on purchase detail (`PurchaseReceivingClientPanel`) to link **agent client** to order — **not** `appealId` on scanner.

P4 must **not** add appeal-scoped query params, financial formulas, or inline checkout UI without an **explicit cross-owner contract** extension.

---

## `BLOCKED_CONTRACT` — pipeline context

**Verdict:** existing store/scanner pipeline **cannot** carry receiving-appeal context with today’s published surfaces.

| Required for prototype parity | Exists in partner product? | Evidence |
|------------------------------|----------------------------|----------|
| `appealId` (or CRM id) on `/scanner` entry | **No** | `ScannerHub` props: `userId` only; no `searchParams` / appeal |
| `certificateId` / promo prefill from detail | **No** | Certificate → appeal uses workspace **`certificate-entry`** path, not detail CTA |
| `returnTo` detail after checkout | **No** | Nav sections: plain `/scanner`; `store-order-attempt` has **no** `appealId` |
| Guaranteed `purchaseOrderId` on appeal after scanner | **No** | K8 projection + optional order PATCH; no return URL contract |
| Inline pay panel on detail | **No** | Prototype in-page panel; product = leave detail |

Until a **named** contract exists (e.g. documented query keys + scanner reducer + optional return route), P4 treats «Отметить оплату» as **honest pipeline entry**, not **completed payment** or prototype **`panel:pay`**.

---

## Exact acceptance gap (what Root cannot claim)

1. **Flow:** prototype **stay-on-detail** pay review (categories, draft, confirm) vs product **exit-to-scanner** — functional mismatch, not copy.
2. **Association:** tap «Отметить оплату» does not bind checkout to **this** `appealId` / certificate.
3. **Return journey:** no specified path back to `ReceivingAppealDetailView` with refreshed `purchaseOrderId` / paid projection.
4. **Requirements:** C17 (refusal/review), C22–C24 (purchase form lifecycle) — **not equivalent** to one scanner hop (+ matrix still lists API blocker for full CRM).
5. **375/1440 light/dark slice** — layout fit only; **not** full-shell/font/prototype acceptance (per Root).

---

## Coordinate with P6 (interface only)

| Topic | P6 @ `2375944e` | P4 |
|-------|-----------------|-----|
| Revision / refresh / notice | host + API | consumes `expectedRevision`, `error`, `onConflict` |
| Scanner button | `router.push("/scanner")` | `markPaid` / `paidReview` labels only |
| Purchase button | history route when `purchaseOrderId` | `onOpenPurchaseOrder` |
| Appeal↔order context | **not wired** | **BLOCKED_CONTRACT** — report, do not invent |

No P4 code changes required for prep beyond this audit + contract comments unless a future **approved** navigation contract adds typed deps to `ReceivingAppealDetailHostDeps` (P6 implements; P4 renders).
