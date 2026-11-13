# П6 → K1 — Clients certificate entry (store scan chain, no store route edits)

**Scope:** replace always-501 scaffold on **new** Clients route only.  
**Do not edit:** `storeCertificateScan.ts`, `authorizeStoreScan` / `validateCertificateForStore` sources, store order/finance routes.

## Flow (Root-verified)

1. **POST** `/api/pro/client-appeals/certificate-entry` (K1 + P1 allowlist).
2. `requireOwnerClientsContext` + existing receiving mutation/list rules.
3. **`authorizeStoreScan(user, branchId?)`** — same denial as store scan when branch/role rejects (403, real message).
4. **`validateCertificateForStore`** — **read-only**; no order create.
5. Idempotent **find/create appeal** scoped to `receivingPartnerUserId` + `certificateId` / code (K8 `findActiveReceivingAppeal` predicate).

## Request / response (П6 consumer)

**Request**

```json
{ "certificateCode": "<qrCode or promoCode — same as order preview>" }
```

**Success** `200|201`

```json
{
  "outcome": "created",
  "appeal": { "id": "…", "receivingPartnerUserId": "…", "certificateId": "…", … }
}
```

| `outcome` | UI |
|-----------|-----|
| `created` | Open detail (prototype after `runScanPage` new cert) |
| `existing` | Open detail for active appeal (prototype `repeat` + `findActiveAppeal`) |

**Errors (honest — no client-side fake success)**

| HTTP | Когда | UI |
|------|--------|-----|
| 403 | `authorizeStoreScan` / mutation gate | Show server message; no appeal |
| 404 / 400 / 422 | Invalid/expired cert (`validateCertificateForStore`) | Alert: «Сертификат недействителен…» |
| 409 | Active appeal exists for cert+receiver | Alert: duplicate active (prototype `findActiveAppeal` guard) |
| 501→replaced | Scaffold removed by K1 | — |

## promoCode / result coordination

- Input normalization on **client:** `extractCertificateCode` (QR URL or `RC-*` promo) before POST.
- **Server** resolves certificate row; response `appeal.certificateId` / public cert fields for detail (P4).
- **Not in scope:** `POST /api/store/order/preview`, `POST /api/store/order` — receiving entry must not create purchase/bonus.

## P6 UI (`ReceivingCertificateScan`)

- No prototype demo outcome radios (`new`/`invalid`/`repeat`).
- Submit blocked until `isReceivingCertificateEntryProxyReady()`; list-only employee: read-only shell (no submit).

## Remaining integration events (report only)

| Event | Owner |
|-------|--------|
| P1 allowlist `POST …/certificate-entry` | P1 |
| Shared camera / `ScannerHub` navigation into Clients scan | Out of П6 allowlist — product decision |
| GET store scan page unchanged | Navigator |

**No API execution in П6 task** — synthetic UI tests only.
