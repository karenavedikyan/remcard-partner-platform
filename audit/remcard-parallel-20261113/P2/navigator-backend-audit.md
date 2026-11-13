# П2 — Backend contract cross-audit (`remcard-navigator`)

## Access

| Method | Result |
| --- | --- |
| `cursor-github` `get_repository` / `get_commit` / `get_file_contents` / `get_git_tree` | **OK** (private repo readable) |
| `git clone https://github.com/karenavedikyan/remcard-navigator.git` on agent VM | **FAILED** — `remote: Repository not found` (HTTP git token on VM lacks private clone) |
| `gh api repos/.../contents/` root | **404** (CLI token scope differs from MCP) |

Evidence was collected via **GitHub MCP** at backend tip **`3cb569ffa5f2991be57235622691dc9ff7029050`** (team “current candidate”; 2026-11-13). Full recursive tree SHA: `9b7105af738d8f4a4bc2cc541d78116bd687a1e2`. `main` tip at audit time: `e6696a44` (2026-10-01) — **older** than `3cb569ff`; observer contracts were not found on either tip (tree scan is on candidate only).

### Update — assigned release tip `8137ddd1` (2026-11-13)

| | Value |
| --- | --- |
| SHA | `8137ddd1ae5bad880fa28df34bab04e460bf2bdd` |
| Commit message | `fix(client): align profile card and surface save failures` — **ProfileV2** + K6 client tests only |
| `search_code` | `referred-appeals`, `client-appeals` → **0** hits |
| Observer/receiving delta vs `3c37ca25` / `3cb569ff` | **None** (client UI unrelated to partner Clients contracts) |

Operation-level mapping (list/detail/history, overlay, bulk, receiving CRM): **`contract-operation-matrix-8137.md`**.

Prototype cross-check (partner-platform git object `3dc31836`):

- `design/general-prototype/partner/client-appeals.js` — `ownReferredAppeals()`, observer filters
- `design/general-prototype/partner/observer-personal-list.js` — personal meta in memory
- `design/general-prototype/prototype-page-catalog.json` — keys `partner:*:clients-observer-*`
- `design/general-prototype/client/account.js` — client R1 (not partner observer); cited per team reference list

No `appeal` / `referred-appeals` / `observer` path segments exist anywhere under `src/` in candidate tree.

## Decision table (required observer semantics)

Legend: **Reusable** = could wire partner UI without inventing fields; **Incompatible** = real API exists but wrong entity/auth/shape; **Missing** = no route + no schema for required semantics.

### A. Referred appeals read (BLK-OBSERVER-REFERRED)

Required (partner UI `ObserverReferredAppeal`): list/detail grouped by `receivingPartnerId`, referrer-scoped rows with `stageId`, `clientName`, `certificateId`, `interest`, `updatedAt`/`referralAt`, partner meta — without CRM write.

| Backend surface | Route | Auth (evidence) | Fields vs required | Decision |
| --- | --- | --- | --- | --- |
| **Dedicated referred appeals** | *(none in tree)* | — | — | **Missing** |
| Agent CRM list | `GET /api/pro/agent-clients` | `requireOwnerClientsListContext` → agent/specialist/business owner (`ownerClientsAccess.ts`) | `AgentClientRow`; owner CRM, not per-direction referral row | **Incompatible** |
| Agent CRM detail + purchases | `GET /api/pro/agent-clients/:id` | same | Adds `purchases` / `recommendationPurchases` on **owned** certs; not “clients at other partners” index | **Incompatible** |
| Agent certificates list | `GET /api/pro/agent-certificates` | `requireAgentR03Context` | Certificate-centric; multi-partner via `partnerOffers`; `status` is cert status not appeal `stageId`; no single `receivingPartnerId` row key | **Incompatible** as drop-in; **not** a documented referrer-appeals contract |
| Store orders (pro) | `GET /api/pro/orders` | `UserRole.PRO` | Orders in **pro context** (receiving/store lens), max 200; not referrer “at partners” list | **Incompatible** |
| Agent receivables orders | `GET /api/pro/wallet/agent-receivables/orders` | `authorizeAgentReceivablesRead` | Wallet settlements; requires `partnerGroupKey`/`partnerId`; not observer list | **Incompatible** |
| Client public lookup | `GET /api/pro/clients/lookup?code=` | Partner user; rate limit | Registered **client** user lookup; not directed appeals | **Incompatible** |

**Conclusion A:** Under `3cb569ff`, **no reusable unchanged read contract** matches prototype `ownReferredAppeals()`. Closest primitives (Certificate + Order + AgentClient) exist in schema/services but are **not exposed** as referrer appeal list and **do not match** view-model without a **new** read API (backend owners).

### B. Per-observer personal overlay (BLK-OBSERVER-PERSONAL-PERSIST)

Required: per viewing partner user, per **referred-appeal id**: `alias`, `tag`, `note`, `bucket` (`active|archived|trash`), `beforeTrash`; bulk tag; archive/trash/restore without mutating partner CRM.

| Backend surface | Route | Auth | Persisted fields | Decision |
| --- | --- | --- | --- | --- |
| **Dedicated personal-meta** | *(none)* | — | — | **Missing** |
| AgentClient PATCH | `PATCH /api/pro/agent-clients/:id` | `requireOwnerClientsContext` | Mutates `displayName`, contacts, `need`, **`note`** (canonical CRM) | **Incompatible** |
| AgentClient batch | `POST /api/pro/agent-clients/batch` | same | `archive` / `restore` / **`delete`** on CRM ids | **Incompatible** (no trash bucket, no appeal scope) |
| Certificate user alias | `PATCH /api/certificate/:code/alias` | `getAuthenticatedUser` + cert access OR | Single **`alias`** on certificate; no tag/note/bucket | **Incompatible** (wrong key: `certificateId`, not appeal id) |
| Cert list alias embed | via `GET /api/pro/agent-certificates` | R03 | `userAlias` from `CertificateUserAlias` | **Incompatible** partial alias only |
| Certificate workspace archive | via R03 list filters / `CertificateProWorkspace` | owner user on cert | **`archivedAt`** workspace-only on certificate | **Incompatible** (not appeal overlay; no trash) |
| Partnership list preference | `GET/PATCH /api/pro/partnership-list-preferences/:partnershipId` | PRO + partnership ownership | `personalAlias`, `archivedAt`, `hiddenAt` on **Partnership** | **Incompatible** (partner row, not referred client; no tag/note/trash) |
| Cabinet UI prefs | `GET/PATCH /api/pro/cabinet-ui-preferences` | R01 pilot | `theme`, `mobileNavKeys` only | **Incompatible** |

Schema anchors (read from `prisma/schema.prisma` at `3cb569ff` via MCP — **no live DB**):

- `AgentClient` — owner CRM (`note`, `archivedAt`, `deletedAt`); no `tag`, no bucket/trash
- `CertificateUserAlias` — `(userId, certificateId) → alias`
- `CertificateProWorkspace` — `(userId, certificateId) → archivedAt`
- `PartnershipListPreference` — `(ownerUserId, partnershipId) → personalAlias, archivedAt, hiddenAt`
- **No** table for `(viewerUserId, referredAppealId) → personal overlay`

**Conclusion B:** **No reusable unchanged write/read contract** for observer personal overlay. Existing “personal” APIs are **different products** (CRM note, cert title, partnership nickname, workspace archive).

## Authorization excerpts (AgentClient ≠ observer)

`requireOwnerClientsListContext` / `requireOwnerClientsContext` (`src/lib/ownerClientsAccess.ts`):

- Authenticated prof cabinet user
- Eligibility: R03 agent business, R06 specialist, or store/company org owner (list adds employee org CRM read)
- **Mutations** reject org workplace context (`requireOwnerClientsContext` → 403)
- Operations scoped to **`ownerUserId`** on `AgentClient.ownerUserId`

This is **receiving/issuing CRM**, not read-only observation of another partner’s handling of a referral.

## Partner-platform proxy gap (unchanged finding)

Even if backend added routes tomorrow, **current** `remcard-partner-platform` at `9fa6cc42` still omits referred/personal paths from `remcard-proxy.ts` and blocks `fetchObserverReferredAppeals()` — wiring is a **separate** owner; P2 does not claim it.

## Can “missing” contracts be satisfied under P2 no-DB/no-rights constraints?

| Missing piece | Within audit-only / no schema / no rights change? |
| --- | --- |
| Referred appeals read API | **No** — requires new routes, query auth, and likely new persistence or certified aggregation over `Certificate`/`Order` |
| Personal overlay API | **No** — requires new table or JSON store + PATCH/batch handlers + referrer/appeal authorization |
| Reuse `AgentClient` PATCH for overlay | **No** — violates semantics and would mutate CRM (forbidden substitute) |
| Reuse `cabinet-ui-preferences` JSON smuggling | **No** — contract is theme/nav only; would be fake persistence and wrong schema |
| Partner-platform-only adapter with `ok:true` without backend | **No** — forbidden fake success |

Implementers need **navigator backend** change + **proxy allowlist** + client adapter; not achievable in P2 scope.

## Minimal contract proposals (unchanged intent, backend-only)

See `contract-decisions.json` — still valid; navigator audit **does not** replace them with an existing route.

Proposed keys remain:

- Read: `GET /api/pro/referred-appeals`, `GET .../:id`, `GET .../by-partner/:partnerId`
- Write: `PATCH .../:id/personal-meta`, `POST .../personal-batch`

## Release history

`list_releases` → **empty** (no GitHub releases). Contract evidence is commit/tree anchored at **`3cb569ff`**, not a release tag.
