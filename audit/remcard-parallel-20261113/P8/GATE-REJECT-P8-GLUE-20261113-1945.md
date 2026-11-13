# P8 gate — reject foreign glue + owner canonical audit

**Mode:** READ-ONLY acceptance · **P8 tip:** `7823b976` (includes rejected product `528bdd2a` — **Root will not select**)

## P8 duplicate paths (do not package; owner originals only)

| P8 path @ `528bdd2a` | Canonical owner |
|----------------------|-----------------|
| `src/lib/clientAppeals/orderLink*.ts` | **K8** `8227899e8` (not present @ partner `66960fb5`; navigator read **NOT_VERIFIED** this VM) |
| `src/lib/clients-parity/receiving-appeal-routes.ts` | **P4** `src/components/clients/receiving/receiving-appeal-navigation.ts` @ `725e7c47` |
| `src/lib/clients-parity/receiving-order-link-client.ts` | **P6** `postReceivingAppealOrderLink` in `receiving-appeals-api.ts` @ `66960fb5` |
| `src/lib/clients-parity/receiving-appeal-scanner-context.ts` | **P6** `src/lib/scanner/receiving-appeal-handoff.ts` @ `66960fb5` |
| `useReceivingAppealOrderLink.ts` / `ReceivingAppealOrderLinkBanner.tsx` | **P6** `useReceivingAppealScannerHandoff.ts` + `ReceivingAppealScannerPanels.tsx` @ `66960fb5` |
| `remcard-proxy.ts` client-appeals block | **P1** @ `75cd0621` (+ frozen pin line) |
| 13 vitest mocks | **Not acceptance** — owner suites @ `66960fb5` / `75cd0621` / `3977ee48` |

**User rejection (stale vs canonical):** P6 `ScannerHub` / scanner handoff → use **`66960fb5`**; P1 `PurchaseDetail` → use **`75cd0621`** with **pending correction** (below).

---

## Authoritative owner pins (this pass)

| Owner | Pin | Read status |
|-------|-----|-------------|
| K8 | `8227899e8` | **NOT_VERIFIED** (422 on partner API; no `linkReceivingAppealOrder` @ `66960fb5`) |
| K1 | `a2196c0e` | **NOT_VERIFIED** (same) |
| P4 | `725e7c47` | Read OK — `assertReceivingAppealId`, `ReceivingAppealNavigationError` |
| P1 | `75cd0621` | Read OK — `PurchaseAppealReturnLink` + `receiving-appeal-return-href.ts` mirror |
| P6 | `66960fb5` | Read OK — scanner handoff, order-link client, panels |
| P3 | `3977ee48` | Read OK — personal save + stale GET merge |

---

## Narrow reproducible FAILs (safety / handoff)

### FAIL-A — order context return (P6 + P1)

**Reproduce (source):** @ `66960fb5`, `ReceivingAppealScannerSuccessLinkPanel` sets `purchaseHref = receivingAppealPurchaseDetailHref(orderId)` **without** `?appealId=`. @ `75cd0621`, `PurchaseAppealReturnLink` only renders when `?appealId=` is present on purchase detail.

**Effect:** Card → scanner → order success → «Открыть покупку» → **no** «К обращению» on purchase page.

**Owner:** **P6** `66960fb5` (append scoped appeal query on purchase navigation); **P1** `75cd0621` (PurchaseDetail wiring **stale / pending correction** per Root).

---

### FAIL-B — P4 navigation safety not consumed in P6 contract fork

**Reproduce:** @ `725e7c47`, `buildReceivingAppealOrderPipelineHref` uses `assertReceivingAppealId` (rejects `https:`, `#`, etc.). @ `66960fb5`, duplicate builders in `receiving-detail-actions-contract.ts` use **trim only** and do **not** import `receiving-appeal-navigation.ts`.

**Effect:** P6/P4 path fork; unsafe id could reach query string if host passes untrusted id.

**Owner:** **P6** — import P4 `receiving-appeal-navigation.ts`; **P4** `725e7c47` is canonical.

---

### FAIL-C — K8/K1 order-link backend not verifiable on partner tree

**Reproduce:** `git grep linkReceivingAppealOrder 66960fb5` → empty. P6 client calls `POST …/order-link` with `isReceivingAppealOrderLinkProxyReady` only.

**Effect:** Live link **BLOCKED** until K1 route + K8 `orderLink.ts` on navigator (pins **NOT_VERIFIED** here).

**Owner:** **K8** `8227899e8`, **K1** `a2196c0e`, **Root** G7/apply separate.

---

### FAIL-D — P3 observer personal: awaiting P5 props + detail mapper

**Reproduce:** @ `3977ee48`, `ObserverPartnersWorkspace` uses `personalPersistence ?? defaultPersonalPersistence` (blocked without parent bridge). Persistence tests use **intercepted** `remcardFetch` (P5 dep @ `164b8dbe`).

**Effect:** Live cabinet still **BLOCKED_PERSISTENCE** until P5 adapter wired from parent + K1 referred routes on prod.

**Owner:** **P3** `3977ee48` + **P5** `164b8dbe` — **not** closed on prod `57ca4680`.

---

## Cleared in owner source (do not re-assert P8 glue)

| Criterion | @ canonical |
|-----------|-------------|
| Link retry **only** order-link (not store order) | P6 `ReceivingAppealScannerSuccessLinkPanel` + `useReceivingAppealScannerHandoff` |
| Order-exists copy on link failure | P6 panels @ `66960fb5` |
| Purchase return mirror without importing P4 file into P1 | `receiving-appeal-return-href.ts` @ `75cd0621` |
| Observer 409 / batch skip selection | P3 `P3.observer-persistence-bridge.fetch.test.tsx` @ `3977ee48` |

---

## Verdict

- **P8 `528bdd2a`/`7823b976`:** **REJECTED** — duplicate foreign product; **not** acceptance.
- **Whole Clients:** **NO-GO** (unchanged).
- **Mounted visual / browser:** **NOT_VERIFIED** (P8 does not run owner UI matrix).

**FINISHED** = audit record only.
