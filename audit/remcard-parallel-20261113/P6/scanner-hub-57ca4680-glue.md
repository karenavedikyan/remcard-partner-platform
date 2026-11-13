# P6 — receiving glue on `ScannerHub.tsx` @ production `57ca4680`

Branch pin may lack production scanner import graph (`PurchaseReviewModal`, branch context, etc.).  
**Do not** keep the ~925-line branch hub when assembling `57ca4680`. Start from production blob (1412 lines), then apply this glue only.

## Imports (add)

- `useSearchParams` from `next/navigation`
- `useReceivingAppealScannerHandoff` from `./useReceivingAppealScannerHandoff`
- `ReceivingAppealScannerBanner`, `ReceivingAppealScannerSuccessLinkPanel` from `./ReceivingAppealScannerPanels`

## Hub body (minimal)

1. `const searchParams = useSearchParams()`
2. `const receivingHandoff = useReceivingAppealScannerHandoff(searchParams.get("appealId"))`
3. `const receivingRef = useRef(receivingHandoff); receivingRef.current = receivingHandoff`
4. Prefill `manualCode` once from `receivingHandoff.certificatePrefillCode` (gen guard)
5. `applyPostOutcome` success: `receivingRef.current.beginOrderLinkAfterSuccess(orderId)` when ready && !`orderAlreadyLinked` — **not** in callback deps
6. `runPreview`: cert gate via `receivingRef.current.assertPreviewAllowed` — **not** in callback deps
7. `confirmNewPurchase`: block `appealInvalid`, `!allowsNewStoreOrder`, `requiresAppealReady`, already linked
8. Early return: `appealInvalid`, terminal context errors, `orderAlreadyLinked` ready (banner only)
9. Success UI: appeal branch uses `ReceivingAppealScannerSuccessLinkPanel`
10. Banner on preview + default workbench paths

## Unchanged

Store order POST body, idempotency, branch/reward modals, attempt restore — production-only.
