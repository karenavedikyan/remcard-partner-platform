# STORE-COMPANY-CLIENTS-01 (A/B/C closure)

**Status: READY FOR REVIEW**

## A — Purchases (honest scope)

| Slice | Contract |
| --- | --- |
| **По нашим рекомендациям (business)** | Orders on **owner-issued** certs for CRM client, excluding acceptance at own org (`certificatePartnerId` null **or** partner ≠ owner). |
| **Покупки у нас (business)** | Orders at own org where **we issued** the cert with `agentClientId` on this CRM client (`certificate.proUserId = owner`). |
| **BLOCKED (documented, no schema change)** | Purchases at our store using **another recommender’s** certificate — no `AgentClient` link on accepting owner (`receivingPurchaseScope.blockedIncomingThirdPartyRecommender`). Leak fixture proves foreign issuer order id **not** listed on store CRM client receiving panel. |
| **Agent/specialist** | **Legacy** `listAgentClientLegacyPurchases` — all orders on owner certs (nullable `certificatePartnerId` preserved). |

UI footer: all order statuses shown; aggregate counter remains confirmed-only.

## B — Gate flows

- STORE + COMPANY: create with phone/email/need → edit/clear → reload readback → UI cert POST id match on detail → archive/restore → disposable **UI delete** with confirm.
- Mutations: real foreign client id in batch skip; store uses company foreign CRM id, company uses **store-owned** foreign CRM id; injection read own 200 / other owner 404.
- `ownerClientCertificateLink.test.ts`: prisma + proContext mocked (no DATABASE_URL).

## C — Stability

- Detail load error + **Повторить** (`client-detail-retry`); race test clicks retry.
- `OwnerClientsGate`: business `/me`+`/context` failure → error+retry (not silent empty).
- List load generation unit mirror: `clientsListLoadGuard.test.ts`.

## Single success capture (aligned)

| Field | Value |
| --- | --- |
| FE application SHA | `e79cc33431bc7c6c86db5d0c30ebe25bd0640c78` |
| BE application SHA | `8b1e932ea9c611ccb5e2aac18ab50dac7faebbf1` |
| Capture | `2026-10-25T14:14:01.000Z` → `2026-10-25T14:16:09.786Z` |
| Exit | `0` (`shell-browser-gate.exit`) |
| stdout / `shell-gate.json` / `metadata-shell.json` | Same `applicationRuntime` object |

Command: `bash scripts/store-company-clients-01/run-browser-gate.sh`

## Deploy

Backend first (`agentClientPurchases`, `agentClientPurchaseScope`, `ownerClientCertificateLink`, detail API fields).

Branches: `feat/store-company-clients-01` on both repos @ SHAs above.
