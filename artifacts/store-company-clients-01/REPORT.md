# STORE-COMPANY-CLIENTS-01

**Status: READY FOR REVIEW (acceptance groups A–C)**

## A. Purchases semantics

- **По нашим рекомендациям:** `listAgentClientRecommendationPurchases` — заказы с `certificate.agentClientId`, `certificate.proUserId = owner`, `order.proUserId = owner`, принятие у **чужого** партнёра (`certificatePartner.storeUserId ≠ owner`).
- **Покупки у нас:** `listAgentClientReceivingPurchases` — заказы с той же привязкой сертификата к CRM-клиенту, принятие у **своей** организации (`certificatePartner.storeUserId = owner`). Без join по телефону/имени, без CLIENT User и без всех org orders.
- Business detail: две секции (`client-recommendation-purchases`, `client-receiving-purchases`). Agent/specialist — одна история (исходящие).
- Copy: контакты «не отправляются партнёрам автоматически» (`businessClientsPageCopy`).
- Fixture: `seed-business-client-receiving-purchase.ts` → `gateReceivingClientId` + подтверждённый order; foreign client read/deny в gate.

## B. Flow & mutations (isolated gate)

- STORE + COMPANY real owners: UI create → detail → edit note/need/phone clear → reload → archive/restore on detail.
- Certificate: UI wizard (partner → discounts → **POST `/api/store/certificate`** with `agentClientId`) + detail API shows linked certs. Backend: `resolveClientCertificateLinkAccess` allows **business** org owners.
- Mutations: protected delete 409 with cert; batch delete partial (own disposable + foreign id); POST injection (`ownerUserId`/`org`/`actor`) ignored; delegated STORE/COMPANY foreign PATCH/DELETE deny.
- **Need/потребность:** editable/clear in business via shared `AgentClientFormDialog` + PATCH.

## C. Race & gate resilience

- `AgentClientsList` / `AgentClientDetail`: load generation guards; detail clears state on `clientId` change.
- `AgentClientDetail.race.test.tsx`: stale response + error path.
- `OwnerClientsGate`: R03/R06 first; business `/me`+`/context` isolated (failures there do not break agent/specialist).
- BE `ownerClientsAccess.test.ts`: COMPANY owner, staff deny, `proCtx` reset in `beforeEach`.

## Runtime SHA (gate capture)

| | SHA / time |
| --- | --- |
| Frontend application | `f78052a7c0782dc9736b6821d571472560de5d2d` |
| Backend application | `f713bf25b58fde996c6130baa12a1068022f711b` |
| Capture | `2026-10-25T14:06:01.000Z` → `2026-10-25T14:08:06.168Z` |
| Gate exit | `0` (`shell-browser-gate.exit`) |

Stdout includes top-level `applicationRuntime` (see `shell-gate.json`).

## Backend deploy note

Product changes beyond owner clients guard:

- `ownerClientsAccess.ts` (business mode)
- `agentClientPurchases.ts` (split lists)
- `ownerClientCertificateLink.ts` (business cert ↔ client link)

**Deploy backend first**, then frontend.

## Branches

- FE: `feat/store-company-clients-01` @ `f78052a7`
- BE: `feat/store-company-clients-01` @ `f713bf25`
