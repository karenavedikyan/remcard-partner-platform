# P2 — Operation × contract matrix (`remcard-navigator` @ `8137ddd1`)

**Navigator assigned release tip:** `8137ddd1ae5bad880fa28df34bab04e460bf2bdd` (2026-11-13). Commit touches **client** `ProfileV2.tsx` + K6 tests only — **not** partner observer/receiving backend.

**Prototype (frozen):** `3dc31836` — `design/general-prototype/partner/client-appeals.js`, `observer-personal-list.js`.

**Partner platform (read-only):** `src/lib/remcard-proxy.ts` — no `referred-appeals`, `client-appeals`, `personal-meta`; `fetch-observer-appeals.ts` → `BLOCKED_CONTRACT`.

Evidence: GitHub MCP `get_file_contents` / `search_code` at `8137ddd1`; schema excerpt in prior tree capture (`prisma/schema.prisma`). VM `git clone` of private navigator still **404**.

**No-schema path under P2 restrictions:** **None.** No unchanged route chain can implement prototype `Appeal` rows, `history[]`, per-referrer observer overlay, receiving `workingStages`, or incoming CRM without **new** navigator routes and persistence (forbidden in P2).

Legend: **Gap** = no route/field; **Incompat** = real API, wrong entity/auth/shape; **Partial** = subset only.

---

## A. Observer — «Мои клиенты у партнёров» (`BLK-OBSERVER-REFERRED`)

Prototype: `ownReferredAppeals()` — filter in-memory `appeals` where `referrerPartnerId === viewer` and certificate flow present; group by `receivingPartnerId`.

| # | Prototype operation | Required id / storage | Existing navigator path | Auth | Verdict |
| --- | --- | --- | --- | --- | --- |
| O1 | Partner list + counts (C26–C34) | `appeals[]`, `receivingPartnerId`, partner meta | *(none)* | — | **Gap** |
| O2 | List referred rows (filters `q`, period) | Same + `stageId`, `updatedAt` | `GET /api/pro/agent-certificates` returns **certificates**, not appeal rows; no `receivingPartnerId` list key | `requireAgentR03Context` | **Incompat** |
| O3 | Detail by appeal id (C39–C40) | `Appeal` + `history[]` | `GET /api/pro/agent-clients/:id` — **AgentClient** CRM + purchases on **owned** certs | `requireOwnerClientsListContext` | **Incompat** |
| O4 | Detail by partner (drill) | `GET …/by-partner/:partnerId` | *(none)* | — | **Gap** |
| O5 | Appeal **history** timeline | `history: {at, author, text, reason?}[]` on appeal | `OrderReceivingAgentClientLinkEvent` — order link actions only (`action`, `orderId`); `LeadReply` — lead thread; no certificate-referral appeal log | order/pro CRUD scopes | **Incompat** |
| O6 | Read-only guarantee (no CRM write) | Observer must not PATCH receiving data | N/A until read API exists | — | **Blocked** until O1/O3 contracts + auth |

**Nearest read primitives (do not wire as drop-in):**

| Route | What it returns | Missing vs `Appeal` |
| --- | --- | --- |
| `GET /api/pro/agent-certificates` | Cert list, `userAlias`, partner offers | No single row per (cert, receiving partner); cert `status` ≠ `stageId`; no `privateNotes` on observer slice |
| `GET /api/pro/agent-clients` | Owner CRM contacts | Rows are **issuer** contacts, not “clients handled at another partner” |
| `GET /api/pro/wallet/agent-receivables/orders` | Settlement orders | Wallet lens; needs `partnerGroupKey`; not observer index |
| `GET /api/leads?role=sender` | `Lead` where `senderId=user` | **Lead** domain (CLIENT/CONCIERGE sources); not certificate referral pipeline |
| `GET /api/pro/requests` | Form `Request` inbox | `targetUserId` PRO forms; optional `leadId`; not appeals CRM |

Schema: `Certificate`, `Order`, `CertificatePartner`, `AgentClient` — **no** `Appeal` / `ReferredAppeal` model; no `(referrerPartnerId, receivingPartnerId, certificateId)` aggregate API.

---

## B. Observer personal overlay (`BLK-OBSERVER-PERSONAL-PERSIST`)

Prototype: `observer-personal-list.js` — `workspace.observerPersonal.meta[appealId]` with `alias`, `tag`, `note`, `bucket` (`active|archived|trash`), `beforeTrash`; bulk `set-tag`, archive, trash, restore.

| # | Prototype operation | Key | Existing path | Persisted fields | Verdict |
| --- | --- | --- | --- | --- | --- |
| P1 | Save alias/tag/note | `(viewerUserId, appealId)` | *(none)* | — | **Gap** |
| P2 | Bucket active/archived/trash + restore | `bucket`, `beforeTrash` | *(none)* | — | **Gap** |
| P3 | Bulk tag / archive / trash / restore | `ids[]`, `op` | *(none)* | — | **Gap** |
| P4 | Alias “for myself” only | Must not change `clientName` at partner | `PATCH /api/pro/agent-clients/:id` | `displayName`, contacts, **`note`** (canonical CRM) | **Incompat** (forbidden substitute) |
| P5 | Bulk archive/delete | CRM ids | `POST /api/pro/agent-clients/batch` | `archive`, `restore`, **`delete`** on `AgentClient` | **Incompat** (no tag/trash; wrong id) |
| P6 | Cert title alias | `certificateId` | `PATCH /api/certificate/:code/alias` | `CertificateUserAlias.alias` only | **Incompat** (no tag/note/bucket; wrong key) |
| P7 | Partnership nickname | `partnershipId` | `GET/PATCH /api/pro/partnership-list-preferences/:partnershipId` | `personalAlias`, `archivedAt`, `hiddenAt` | **Incompat** (partner row, not appeal) |
| P8 | Cert workspace archive | `certificateId` | `CertificateProWorkspace.archivedAt` via R03 | archive cert in **owner** workspace | **Incompat** (no trash overlay on appeal) |
| P9 | Executor note on lead | `leadAssignmentId` | `LeadAssignment.executorNote`, `hiddenByExecutor`, `archivedByExecutor` | Lead executor UX | **Incompat** (Lead ≠ referred appeal id) |
| P10 | Sender lead archive | `leadId` | `PATCH /api/leads/:id/archive` | `Lead.archived` / `archivedByExecutor` | **Incompat** |

Schema: **no** `(viewerUserId, referredAppealId) → {alias, tag, note, bucket, beforeTrash}` table or documented JSON store.

Partner UI: `ObserverPartnersListView` — save → `notifyPersistenceBlock`; **no** HTTP.

---

## C. Receiving CRM — «Клиенты у меня» / incoming (`BLK-RECEIVING-APPEALS`)

Prototype: same `appeals[]` where `receivingPartnerId === viewer`; `workingStages` per partner; `stageId` transitions; `manualEntry`; analytics; purchase linking — expects `GET/POST /api/pro/client-appeals*` (see `contracts.ts`).

| # | Prototype operation | Required | Existing path | Verdict |
| --- | --- | --- | --- | --- |
| R1 | List incoming appeals + stages | `client-appeals` list + `stageId` | *(none)* | **Gap** |
| R2 | Create manual appeal | `POST /api/pro/client-appeals` | *(none)* | **Gap** |
| R3 | Patch stage / fields | `PATCH /api/pro/client-appeals/:id` | *(none)* | **Gap** |
| R4 | Batch ops | `POST /api/pro/client-appeals/batch` | *(none)* | **Gap** |
| R5 | Working stages CRUD | `GET/POST …/working-stages` | In-memory `workspace.partnerSettings[].workingStages` in prototype only | **Gap** |
| R6 | Link purchase to appeal | `purchaseId` on appeal | `PATCH /api/store/orders/:orderId/receiving-client` (store scope) | **Partial** — links order ↔ receiving client anchor, **not** appeals list/stage |
| R7 | Receiving-side CRM card | `privateNotes`, client contact | `GET/PATCH /api/pro/agent-clients/:id` | **Incompat** — owner CRM, not appeal-centric receiving inbox |
| R8 | Order ↔ CRM client bind | receiving owner | `OrderReceivingAgentClientLink` + store API | **Partial** — persistence exists; **no** `client-appeals` façade or `stageId` |
| R9 | “Incoming” marketplace leads | — | `GET /api/leads?role=executor` | **Incompat** — catalog leads, custom statuses `LeadStatus`, not cert appeals + `workingStages` |
| R10 | Form requests inbox | — | `GET /api/pro/requests` | **Incompat** — web form requests, `stage` on `Request`, not appeals CRM |
| R11 | Cross-partner requests | — | `GET /api/pro/cross-requests` | **Incompat** — `crossRequest` negotiations, not receiving appeals |

**Conclusion C:** Receiving prototype is a **dedicated appeals product**. Navigator exposes **AgentClient CRUD**, **Leads**, **Requests**, **Orders** — none expose prototype `Appeal` + `workingStages` contract. Partner proxy has **zero** `client-appeals` routes.

---

## D. Minimal numbered decisions (coordinate P5 / P6 / navigator backend)

| Id | Decision | Recommended semantics | Affected models / surfaces |
| --- | --- | --- | --- |
| **D1** | Canonical **`appealId`** | Stable UUID per directed referral row; if derived, document `hash(certificateId + receivingPartnerId + referralOpenedAt)` with migration path | New or materialized view over `Certificate` + `Order` + `CertificatePartner` |
| **D2** | **`stageId` mapping** | Map `Order.status` + cert lifecycle + receiving `workingStages` to prototype system stages (`PAID`, `SHIPPED`, `REFUSED`, …) + per-partner custom stage ids | `Order`, optional `ClientAppealWorkingStage` (new) |
| **D3** | **Observer read auth** | Prof user eligible as **referrer** on certificate; rows read-only; exclude org workplace mutations | New `GET /api/pro/referred-appeals*` authz layer (not `requireOwnerClientsContext`) |
| **D4** | **Personal overlay store** | `(viewerUserId, appealId) → {alias, tag, note, bucket, beforeTrash}`; PATCH must not touch `AgentClient` or appeal stage | **New table** (P2 forbids shipping without migration) |
| **D5** | **Receiving appeals API** | Full `client-appeals` resource as in `contracts.ts`; separate from `Lead`/`Request` | New routes + link to `Order` / `AgentClient` where needed |
| **D6** | **Partner proxy allowlist** | Add referred + client-appeals paths; implement adapters (not BLOCKED stub) | `remcard-proxy.ts`, `fetch-observer-appeals.ts` — **P5/P6** |
| **D7** | **Forbidden wiring** | Do **not** map observer personal save → `PATCH /api/pro/agent-clients/:id` | Enforced in UI (current) + contract tests |

---

## E. Blocker resolution summary @ `8137ddd1`

| Blocker | Resolution | Owner | Next action |
| --- | --- | --- | --- |
| **BLK-OBSERVER-REFERRED** | **Still MISSING** — 8137 does not add routes; no composable read path | Navigator backend | Implement D1–D3; release on `release/prof-backend-v1-*` |
| **BLK-OBSERVER-PERSONAL-PERSIST** | **Still MISSING** — no overlay schema/routes | Navigator backend | Implement D4; reject AgentClient substitute |
| **BLK-RECEIVING-APPEALS** | **Still MISSING** — no `client-appeals*`; Leads/Requests ≠ prototype | Navigator backend + product | Implement D5; stage model D2 |
| Proxy / adapter | **ABSENT** on partner-platform | P5/P6 | D6 after navigator contract smoke |
| **П2 re-audit** | Matrix committed | П2 | Re-run at next navigator tip after D1–D6 land |

---

## F. User restriction preventing “complete path” without backend

Per task: **no** DB/schema/migrations, **no** new API implementation, **no** localStorage/fixtures/silent success, **no** AgentClient CRUD as overlay. Therefore **only** backend (navigator) + proxy (partner) owners can close blockers; П2 cannot authorize publication of live observer/receiving data.
