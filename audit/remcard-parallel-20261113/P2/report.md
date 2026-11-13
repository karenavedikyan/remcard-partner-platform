# П2 — Контракты и сохранение Клиентов (read-only contract audit)

## Identity

| Field | Value |
| --- | --- |
| Agent | П2 — Контракты и сохранение Клиентов |
| Branch | `cursor/2-06bf` |
| Prior audit tip | `e0063d15cb2887f61077cdfad066615845837bb0` |
| Base SHA (team candidate) | `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0` |
| Navigator backend scanned | `3cb569ffa5f2991be57235622691dc9ff7029050` |
| Production base (reference only) | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Prototype SHA | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| Disk at audit start | 246G free on `/dev/vdc` |
| Product writes | none (audit directory only) |
| Commit trailer compliance (`bd4749b9`) | **BLOCKED** — platform appended extra `Co-authored-by: Аведикян Карен` after intended single Perplexity trailer |

## Scope

Verified referred-appeal list/detail contracts and per-observer personal overlay (alias, tag, note, archive, trash, restore) against:

- Partner-platform proxy allowlist (`src/lib/remcard-proxy.ts`)
- **Backend** `karenavedikyan/remcard-navigator` at `3cb569ff` (routes + Prisma schema via GitHub MCP; no DB queries)
- Client adapters (`fetch-observer-appeals.ts`, `agent-r03/api.ts`)
- Observer UI call sites (`ObserverPartnersWorkspace`, `ObserverPartnersListView`, personal panels)
- Frozen prototype (`3dc31836`: `design/general-prototype/partner/{client-appeals.js,observer-personal-list.js}`, `prototype-page-catalog.json`, `client/account.js`)

## Executive verdict

| Blocker | Repository evidence | Verdict |
| --- | --- | --- |
| **BLK-OBSERVER-REFERRED** (C26–C34, C39–C40 data) | No referred-appeals routes in **navigator** `3cb569ff`; partner proxy unwired; adapter blocked | **MISSING — confirmed (not proxy-only gap)** |
| **BLK-OBSERVER-PERSONAL-PERSIST** (C35–C38) | No overlay schema/routes in navigator; nearest APIs are CRM/cert/partnership prefs | **MISSING — confirmed** |
| AgentClient CRUD as substitute | Navigator `GET/PATCH/POST /api/pro/agent-clients*` + batch | **REJECTED — existing but incompatible** |

Whole observer data plane remains **BLOCKED** for production load and persistence PASS. UI parity work may continue on fixtures only.

### Navigator cross-check (stage 2)

Full tables: `navigator-backend-audit.md`, machine evidence: `P2.navigator-evidence.json`.

**Access:** GitHub MCP read of private navigator **succeeded**. `git clone` on the agent VM **failed** (`Repository not found` — token), reported as real access error, not “prototype missing locally”.

**Reusable unchanged:** none for required observer contracts.

**Existing but incompatible (navigator `3cb569ff`):**

- `GET/PATCH/POST /api/pro/agent-clients*` — owner CRM (`requireOwnerClientsContext`)
- `GET /api/pro/agent-certificates` — R03 certificate list (partial shape; wrong lifecycle key)
- `PATCH /api/certificate/:code/alias` — `CertificateUserAlias` single field
- `GET/PATCH /api/pro/partnership-list-preferences/:partnershipId` — partnership nickname/archive/hidden
- `CertificateProWorkspace` — per-certificate workspace archive only

**Truly missing:** `/api/pro/referred-appeals*` and `/api/pro/referred-appeals/.../personal-meta` (+ batch); no `appeal` routes in tree; no Prisma model for per-appeal overlay (`tag`, `note`, `trash` bucket).

## 1. Referred appeals — prototype vs product

### Prototype (verified at `3dc31836`)

- `ownReferredAppeals()` in `client-appeals.js` returns in-memory `appeals` where `referrerPartnerId === REFERRER_VIEWER.id`, certificate flow present, receiving partner known.
- Record shape documented in prototype comments: `id`, `clientName`, `referrerPartnerId`, `receivingPartnerId`, `stageId`, `updatedAt`, `referralAt`/`createdAt`, `interest`, `certificateId`, etc.
- No HTTP API in prototype for this list — pure demo data + filter helpers mirroring `src/lib/clients-parity/filter-observer.ts` / `types.ts`.

### Product (HEAD `9fa6cc42`)

| Layer | Behavior |
| --- | --- |
| Types | `ObserverReferredAppeal`, `ObserverPartnerMeta` in `src/lib/clients-parity/types.ts` — view-model aligned to prototype comments |
| Load | `fetch-observer-appeals.ts` returns `BLOCKED_CONTRACT` with `missingRoutes` from `contracts.ts` — **no `remcardFetch`** |
| Workspace | `ObserverPartnersWorkspace` sets `loadState=blocked` on failed load; production user sees blocked contract banner via `ObserverContractBlocked` |
| Tests | Component tests inject fixtures with `dataContract: { status: "ready" }` — **not** production API proof |

### Proxy inventory (searched full allowlist)

Confirmed **zero** matches for `referred-appeals`, `client-appeals`, or observer-specific paths. Closest unrelated routes:

- `/api/pro/agent-clients*` — agent CRM (see §3)
- `/api/store/orders/:id/receiving-client` — order receiving link (`history-receiving-client-api.ts`)

### Minimal contract decision (proposal — backend owners)

See `contract-decisions.json` → `proposedReadContract`. Key invariant: list returns both `appeals` and `partners` keyed by `receivingPartnerId` so UI can render grouped cards without N+1 partner fetches.

**Status: ABSENT** (not “unsearched” — proxy + client adapter exhaustively checked).

## 2. Personal overlay — prototype vs product

### Prototype (verified at `3dc31836`)

`observer-personal-list.js`:

- Overlay stored in `workspace.observerPersonal.meta[id]` with `alias`, `tag`, `note`, `bucket`, `beforeTrash`.
- Submit handler mutates meta in memory; UI states: *«Демо: изменения до обновления страницы.»*
- Archive/trash only changes `bucket`; explicit copy that partner data is untouched.

### Product

| UI surface | Persistence wiring |
| --- | --- |
| `ObserverPartnersListView` | `personalMeta = displayPersonalMeta` (prop); **no `useState` merge on save** |
| Edit panel | `onAttemptSave` → `notifyPersistenceBlock("Сохранить личные поля")` |
| Confirm panel | `onConfirm` → `notifyPersistenceBlock(archived\|trash\|restore)` |
| `ObserverPersonalEditPanel` | Submit button **hard-disabled** with `title="BLOCKED_PERSISTENCE"` |

Filter/bucket logic in `filter-observer.ts` is ready **if** meta were loaded from API — today only fixtures/tests pass `displayPersonalMeta`.

### Minimal contract decision (proposal — backend owners)

See `contract-decisions.json` → `proposedWriteContract`. Must:

- Scope overlay to `(viewerUserId, referredAppealId)` — not `agentClientId`
- Never PATCH partner-visible appeal fields through this API
- Support bulk tag + bucket moves matching prototype `apply()` semantics

**Status: ABSENT** — no route, no client function, no schema/Prisma references in this repo (grep on `*.prisma`/SQL: no hits).

## 3. AgentClient CRUD — explicit non-equivalence

Existing production API (`src/lib/agent-r03/api.ts`):

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/pro/agent-clients` | List agent-owned CRM clients (`archived`, `q`, cursor pagination) |
| POST | `/api/pro/agent-clients` | Create CRM client (`displayName`, contacts, `need`, `note`) |
| GET/PATCH/DELETE | `/api/pro/agent-clients/:id` | Read/update/delete **canonical** client record |
| POST | `/api/pro/agent-clients/batch` | `action: archive \| restore \| delete` on CRM ids |

`AgentClientRow` (`types.ts`) has single `note` and `archivedAt` — **no** `tag`, **no** trash bucket, **no** alias distinct from `displayName`.

`AgentClientDetail` PATCH sets `displayName`, contacts, `need` — this changes the CRM record partners may see via certificates, not a private alias overlay.

**Conclusion:** Mapping observer personal save to `patchAgentClient` / `batchAgentClients` would violate prototype semantics and `author-handoff-v6.json` forbidden claims. UI correctly does not call these APIs from observer tools.

## 4. Requirement ledger (owned audit scope)

| Req | Summary | Audit result |
| --- | --- | --- |
| C26–C28 | Partner cards / layout | IN_PROGRESS UI; **FAIL data** without referred API |
| C29–C31 | Disclosure, selection | IN_PROGRESS session UI; vitest PASS on fixtures |
| C32 | Expanded client rows under partner | **BLOCKED** (no live appeal fields) |
| C33 | Filters/layout | IN_PROGRESS; filter logic unit-ready |
| C34 | Filter vs API semantics | **BLOCKED** |
| C35 | Single edit save | UI only; **BLOCKED** persistence |
| C36 | Bulk tag save | UI only; **BLOCKED** persistence |
| C37 | Archive/trash/restore confirm | UI shows confirm; **BLOCKED** on confirm |
| C38 | Reload persistence | **BLOCKED** |
| C39–C40 | Drill-down pages | Fixture nav PASS; **BLOCKED** production data |
| C41 | URL/id guard | **NOT_STARTED** (server) |

Browser QA for contracts: **BLOCKED** (would require real backend or forbidden fake persistence).

## 5. Cross-owner dependencies

| Owner | Needed |
| --- | --- |
| Backend / API | Implement and document `referred-appeals` read + `personal-meta` write contracts; add to `remcard-proxy.ts` allowlist |
| П* UI agents | Wire `fetch-observer-appeals.ts` + `ObserverPartnersListView` state only after contracts exist |
| Shared `contracts.ts` | Inventory already lists blockers — reconcile with this audit, no duplicate invention |
| QA fixtures | Exclusive to QA — production must not ship demo appeals as live data |

## 6. Remaining work (П2 only)

- [ ] Re-audit after backend adds routes (diff proxy + new client modules)
- [ ] Confirm OpenAPI/response samples from backend repo (not present in partner-platform)
- [ ] Map C41 authorization rules when referrer detail endpoints land

## 7. Tests executed

See `test-run.log`.

| Suite | Result |
| --- | --- |
| `src/lib/clients-parity/contracts.test.ts` (vitest, 3 tests) | **PASS** |
| `P2.contract-verification.mjs` (standalone, 4 checks) | **PASS** (after root path fix) |
| `P2.contract-verification.test.ts` | **BLOCKED** (not in `vitest.config.ts` include; config read-only) |
| Browser contract QA | **BLOCKED** (no mock backend for referred/personal APIs) |
