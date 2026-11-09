# Scanner approved design handoff (2026-11-09)

Branch: `handoff/scanner-approved-design-20261109`
Baseline parent: `30f77db7cacae998a310e6271da3c3f79da640b6`
Prototype reference: `remcard-navigator` `b9844c0f` (presentation only; not monetary logic).

## Money (production, not prototype)

- Totals use `computeOrderTotals` / `lineDiscountRub`: **whole rubles**, `Math.round` **per category line**, then sum.
- Review modal receives the same `OrderTotals` object as the form; line rows use `lineDiscountRub` (shared helper).
- Regression: amounts `10750` / `5750` / `906` at `10%` / `7%` / `10%` → discount **1569**, due **15837** (not kopeck-style 1568.10 / 15837.90).

## Referring partner

**Frontend:** `ScannerReferringPartnerBlock` + optional `referringPartner` on `OrderPreviewAllowed`. Tolerates missing field (old backend). Shows unavailable copy when null/omitted — does not conflate issuer org, receiving store, or client alias.

**Backend (separate repo/branch):** `karenavedikyan/remcard-navigator` branch `handoff/scanner-referrer-preview-20261109`, SHA `0b42cd21` (parent `985cd487`). Adds `referringPartner` from `Certificate.proUserId` via `buildPublicPartnerProfile` filters only; public certificate/OG unchanged.

Deploy order: backend first, then frontend handoff branch.

## Root browser / production QA

- **`POST /api/store/order/preview` mutates state** (e.g. can set certificate `EXPIRED`). **Do not** run certificate search against production in browser regression.
- Allowed: load `/scanner` shell, theme/layout, static components.
- Browser component harness (mocked, no preview POST): `node scripts/scanner-approved-design-browser-harness.mjs` → `artifacts/scanner-approved-design-harness/*.png`
- Unit layout: `npx vitest run src/components/scanner/PurchaseReviewModal.harness.test.tsx`

## Tests

```bash
npx vitest run src/components/scanner
node --import tsx --test src/lib/order-totals.test.ts   # if tsx wired in CI; else via existing node:test runner
```
