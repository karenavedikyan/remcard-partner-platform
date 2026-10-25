# STORE-COMPANY-CLIENTS-01

**Status: READY FOR REVIEW**

## Reuse map (minimal business delta)

| Existing | Business delta |
| --- | --- |
| `ClientsListWorkspace` / `ClientDetailWorkspace` / `OwnerClientsGate` | Gate adds `business` mode via `/api/auth/me` + `/api/pro/context` (`ORG_OWNER`) |
| `AgentClientsList`, `AgentClientDetail`, forms, toolbar, batch | `accessMode: "business"` — same components, no StoreClientsList copy |
| `/api/pro/agent-clients*` + `ownerUserId` model | `requireOwnerClientsContext` → `mode: "business"` after agent/specialist checks |
| Certificate builder | `ownerClientsUsesRecommendationCerts` → `/recommendations/new?clientId=` (published business issuer path) |
| `clientListRow` | Business copy without agent «бонус —» placeholder |
| Page headings | `businessClientsPageCopy` — eyebrow «Магазин»/«Компания» |

No new CRM schema, no AGENT/SERVICE assignment, no parallel API.

## Owner / actor / mutate contract

- **List/mutate scope:** `agentClient.ownerUserId ===` authenticated PRO user id (unchanged). Org employees without `ORG_OWNER` do not get business clients mode in UI; API returns `OWNER_CLIENTS_INELIGIBLE` / org-owner gate on certificates path reused for consistency.
- **Purchases on detail:** existing `listAgentClientPurchases` — orders on **this owner's** certificates for the client; not a global CLIENT account lookup.
- **Priority:** R03 agent → R06 specialist → business store/company org owner.

## Runtime SHA (gate capture)

| | SHA / time |
| --- | --- |
| Frontend application (gate) | `fdbbf33f…` — see `metadata-shell.json` full hash after docs commit |
| Backend application (gate) | `546606bb…` — product `src` delta + QA seed script |
| Backend product base (unchanged core) | `2b1bac4fbe31e2d686b4a2655d89d0bf7cf9847d` |
| Frontend product base | `6331c0f0f26d9b5d83bcc1dad79288d99585a2f9` |
| Capture | `metadata-shell.json` `captureStartedAt` → `captureCompletedAt` |

## Tests & gate

| Command | Exit |
| --- | --- |
| `vitest` business-clients + `ownerClientsAccess` | 0 |
| `pnpm exec tsc --noEmit` (FE) | 0 |
| `bash scripts/store-company-clients-01/run-browser-gate.sh` | 0 |

### Ordinary owners (`isProfTestUser: false`)

- UI: create client → list → detail → edit note → archive → restore → active list.
- «Создать сертификат» href → `/recommendations/new?clientId=<id>` (verified in DOM).
- Screenshots: `visual-shell/store-clients-real-*`, `company-clients-real-*` (1440/390/320, light/dark), hub visible, overflow ≤ 2px.

### Delegated prof-test

- GET `/api/pro/agent-clients` 200.
- PATCH foreign `gateForeignClientId` (company owner) → **404/403**; allowlist unchanged.

## Backend deploy note

Product change: `src/lib/ownerClientsAccess.ts` only (+ tests). Optional navigator push includes `seed-business-clients-gate-fixtures.ts` (isolated QA, not production runtime).
