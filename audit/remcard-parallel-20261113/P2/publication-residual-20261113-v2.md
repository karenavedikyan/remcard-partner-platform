# П2 — REM-PUBLISH-RESIDUAL-20261113-V2 (contract gate)

Agent: **П2 — Контракты и сохранение Клиентов** (read-only). Does **not** package, deploy, or accept partner «Клиенты» publication.

## Git (partner-platform)

| | SHA |
| --- | --- |
| Base (team candidate) | `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0` |
| Prior audit tip | `50f7307c960622362394a4a7633b195ac891dec4` |
| Branch | `cursor/2-06bf` |

## Backend publication anchor (navigator)

| | Value |
| --- | --- |
| Release branch | `release/prof-backend-v1-20261007` |
| **Published release tip** | **`3c37ca2557069a43544b7d72848fd53c37e3be5e`** |
| Tree (MCP) | `69610e6cf95c8f1e66ef70ecf68f32fc2ff26d41` |
| Prior scan | `3cb569ffa5f2991be57235622691dc9ff7029050` |

**Delta `3cb569ff…` → `3c37ca25…`:** shell/client only (HeaderV2 tablet `lg`, vacancy links removed, `/client/become-pro` → `prof.remcard.ru/join`). **No** new `src/app/api/pro/referred-appeals*`, **no** personal-overlay routes, **no** `appeal`/`observer` paths in tree (0 hits both SHAs).

Prototype (unchanged): `3dc31836` — partner observer in `design/general-prototype/partner/client-appeals.js` + `observer-personal-list.js` (in-memory demo only).

## Publication verdict — observer «Мои клиенты у партнёров»

| Gate | Status | Evidence |
| --- | --- | --- |
| Referred-appeals **read** contract on published backend | **BLOCKED — MISSING** | Navigator `3c37ca25` tree: no referred routes; see `P2.navigator-evidence.json` |
| Personal overlay **persist** contract | **BLOCKED — MISSING** | No schema (`tag`/`note`/`bucket`/`trash`) + no PATCH/batch routes |
| Partner **proxy** wiring | **BLOCKED — ABSENT** | `remcard-proxy.ts`: no `referred-appeals`, no `personal-meta` (mjs audit PASS) |
| Production **client adapter** | **BLOCKED** | `fetch-observer-appeals.ts` always `ok:false` / `BLOCKED_CONTRACT` |
| AgentClient CRUD substitute | **REJECTED** | Navigator `GET/PATCH/POST /api/pro/agent-clients*` = owner CRM (`ownerClientsAccess.ts`) |
| UI section acceptance | **NOT PUBLISHABLE** | Fixture/component PASS ≠ page acceptance; live data BLOCKED |

**Root may publish client shell (books 5–13) without this gate; partner observer CRM slice remains outside P2-ready publication scope.**

## Re-scan at `3c37ca25` (unchanged vs `3cb569ff`)

### Truly missing (required for publication)

1. **`GET /api/pro/referred-appeals`** (+ optional `GET :id`, `GET by-partner/:partnerId`)
2. **`PATCH /api/pro/referred-appeals/:id/personal-meta`**
3. **`POST /api/pro/referred-appeals/personal-batch`**

### Existing but incompatible (do not wire as observer)

| Route | Auth | Why |
| --- | --- | --- |
| `GET/PATCH/POST /api/pro/agent-clients*` | `requireOwnerClientsContext` | CRM `AgentClient`; mutates `displayName`/`note`/`archivedAt` |
| `POST /api/pro/agent-clients/batch` | same | `delete` / archive on CRM ids |
| `GET /api/pro/agent-certificates` | `requireAgentR03Context` | Certificate list; not appeal rows + `stageId` |
| `PATCH /api/certificate/:code/alias` | cert access | `CertificateUserAlias` only |
| `GET/PATCH /api/pro/partnership-list-preferences/:partnershipId` | partnership owner | `personalAlias` on **Partnership**, not appeal |

Full tables: `navigator-backend-audit.md`.

## Minimal contract proposals (backend owners — not implemented by P2)

### Read — `GET /api/pro/referred-appeals`

- **Auth:** authenticated prof cabinet user; rows where viewer is **referrer** (`referrerPartnerId` / `certificate.proUserId`), read-only.
- **Query:** `q`, `period` (`all|30|90|365`), `cursor`, `limit`.
- **200:** `{ appeals: ObserverReferredAppeal[], partners: ObserverPartnerMeta[], nextCursor }`.
- **Must not** return or imply AgentClient CRUD.

### Write — overlay

- **Auth:** same viewer; scope `(viewerUserId, appealId)` where appeal is in referrer list.
- **PATCH** body: `alias?`, `tag?`, `note?`, `bucket?` (`active|archived|trash`), `beforeTrash?`.
- **POST batch:** `ids[]`, `op` (`set-tag|archive|trash|restore`).
- **Invariant:** no mutation of receiving partner CRM, appeal stage, or ledger (prototype `observer-personal-list.js`).

### Decisions needed to unblock

| # | Decision | Owner |
| --- | --- | --- |
| D1 | Canonical **appeal id** (synthetic from certificate+receiving partner vs new entity) | Backend + product |
| D2 | **Stage mapping** from `Order.status` / cert lifecycle → prototype `stageId` | Backend |
| D3 | Referrer **authorization** rules (which certs/orders visible as “at partners”) | Backend rights |
| D4 | Persistence store for overlay (new table vs documented JSON — **requires** DB migration in navigator) | Backend |
| D5 | **`remcard-proxy.ts` allowlist** + `fetch-observer-appeals.ts` implementation | Partner proxy + UI owners |
| D6 | **No** mapping personal save → `patchAgentClient` | All (forbidden) |

## Partner-platform diff relevant to publication (read-only, `9fa6cc42`)

- `fetchObserverReferredAppeals()` → static BLOCKED (no network).
- Observer UI: save disabled + `BLOCKED_PERSISTENCE` notice (honest; not publication-ready).

## Tests run this turn (scoped)

```text
vitest src/lib/clients-parity/contracts.test.ts  → 3 PASS
node audit/.../P2.contract-verification.mjs    → 4 PASS
```

Browser contract QA: **NOT_VERIFIED** (no isolated mock backend; egress blocked). Plan: after D1–D5, integration test against navigator test DB listing referred appeals + PATCH personal-meta idempotency — **not runnable until routes exist**.

## Unresolved blocker + next action

**Blocker:** `BLK-OBSERVER-REFERRED` + `BLK-OBSERVER-PERSONAL-PERSIST` remain **MISSING** on published navigator **`3c37ca25`**; partner proxy still unwired.

**Next action (ordered):**

1. **Navigator backend** — implement D1–D4 on `release/prof-backend-v1-20261007` (or successor), document OpenAPI/contract tests.
2. **Partner platform** — add proxy routes + replace `fetch-observer-appeals.ts` BLOCKED stub (UI owners; not P2).
3. **П2** — re-audit at new navigator tip; update decision table only.
4. **Root/QA** — page acceptance matrix (C26–C41) only after live contract smoke, not component fixtures alone.

## Metadata

New commits from П2: use author `karenavedikyan <105862906+karenavedikyan@users.noreply.github.com>`; if Cursor appends extra `Co-authored-by`, report **BLOCKED_METADATA** (do not rewrite history).
