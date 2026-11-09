# Scanner approved design handoff (2026-11-09)

Branch: `handoff/scanner-approved-design-20261109`  
Baseline parent: `30f77db7cacae998a310e6271da3c3f79da640b6`  
Prototype reference: `remcard-navigator` `b9844c0f` (presentation only; not monetary logic).

## Money (production, not prototype)

- Totals use `computeOrderTotals` / `lineDiscountRub`: **whole rubles**, `Math.round` **per category line**, then sum.
- Review modal receives the same `OrderTotals` object as the form; line rows use `lineDiscountRub` (shared helper).
- Regression: amounts `10750` / `5750` / `906` at `10%` / `7%` / `10%` → discount **1569**, due **15837** (not kopeck-style 1568.10 / 15837.90).

## Referring partner (gap — no UI in this delta)

**Present in `OrderPreviewAllowed` today**

| Field | Meaning |
|-------|---------|
| `certificate.issuer.{label,name}` | Issuing organization (PROF/store/company snapshot) |
| `partner.storeName` | **Recipient** store executing the purchase |
| `certificate.partnerCards[]` | Where the document is accepted (publicName, city, categories) |
| `certificate.userAlias` | Client display alias when provided (not a partner referrer) |

**Not present:** referring person's type, public name, or contact (the prototype «реферер» block).

**Existing authorized contracts checked (frontend types only):**

- `OrderPreviewAllowed` / store order preview response — no referrer fields.
- `StoreCertificate`, `PublicCertificatePayload`, certificate list/detail types — no store-scanner referrer snapshot.
- `AvailablePartnersResponse.isAgentRecommender` applies to **certificate creation** partner picker, not order preview.

**No safe reuse without backend:** pulling profile/phone/email via extra account APIs is out of scope for this frontend-only handoff.

### Proposed minimal extension (separate backend review)

Add optional read-only snapshot on **`OrderPreviewAllowed` only**, populated server-side from data already on the certificate row (no new client identity fetches):

```ts
referringPartner?: {
  kind: "AGENT" | "SPECIALIST" | "STORE"; // or existing issuer-kind enum
  displayName: string; // publicName / storeName already shown elsewhere in product
  contactLine?: string | null; // only if already public in certificate context (e.g. city line), never private phone/email by default
} | null;
```

Rules:

- Do **not** map `issuer` → referrer or `partner` → referrer.
- Omit block entirely when snapshot is null (current production behaviour).
- Frontend can add a labelled «Рекомендовал» section only after this field exists.

## Root browser / production QA

- **`POST /api/store/order/preview` mutates state** (e.g. can set certificate `EXPIRED`). **Do not** run certificate search against production in browser regression.
- Allowed: load `/scanner` shell, theme/layout, static components.
- Component checks: `npx vitest run src/components/scanner/PurchaseReviewModal.harness.test.tsx` (mocked data only).

## Tests

```bash
npx vitest run src/components/scanner
node --import tsx --test src/lib/order-totals.test.ts   # if tsx wired in CI; else via existing node:test runner
```
