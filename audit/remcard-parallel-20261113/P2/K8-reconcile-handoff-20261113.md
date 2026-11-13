# P2 → K8 contract coordinator handoff (2026-11-13)

**User authorization:** prepare API + migration **source** for partner Clients only; **no** migrate deploy, DB access, or proxy implementation by P2.

**P2 tip (inventory):** `ac2d4a7b` → *this turn extends* `src/lib/clients-parity/{contracts,types}.ts`.

**Superseded by:** `K8-root-gaps-reconcile-20261113.md` + `k8-adapter-handoff.json` (K8 candidate `16253b84` + `fc33b4fa` on `cursor/remcard-k8-acceptance-20261113`).

---

## Early interface handoff (implementers read this first)

| Layer | Owner | Deliverable | Ready? |
| --- | --- | --- | --- |
| Prisma + `/api/pro/referred-appeals*` + `/api/pro/client-appeals*` | **K8** | `partner-clients-k8-core` draft | **NO** — draft missing |
| Partner DTO inventory | **P2** | `contracts.ts`, `types.ts` | **Inventory only** — not endpoints |
| Proxy + adapters | **P5/P6** | `remcard-proxy.ts`, `fetch-observer-appeals.ts` | **NO** |
| UI acceptance | **Root** | whole section vs prototype books | **NO** |

---

## D1–D7 reconciliation (P2 locked positions → K8 must match or file disagreement)

| Id | P2 position | Verify against prototype |
| --- | --- | --- |
| **D1** | API `appealId` = UUID string; partner ids = **User.id** (not DEMO-PARTNER-*) | `Appeal.id` in client-appeals.js |
| **D2** | `stageId` values **`sys_new`…`sys_refused`** + custom `workingStages[].id` | `const SYSTEM` in client-appeals.js |
| **D3** | Referrer read auth: existing R03/R06 eligibility; row scope `referrerPartnerId === viewer`; **not** `requireOwnerClientsContext` | `ownReferredAppeals()` filter |
| **D4** | Overlay `(viewerUserId, appealId)` → alias, tag, note, bucket, **beforeTrash** | observer-personal-list.js |
| **D5** | Receiving CRM separate from Leads/Requests; history unshift semantics | client-appeals.js receiving paths |
| **D6** | Proxy allowlist after K8 | partner-platform |
| **D7** | Forbidden: AgentClient CRUD, cert alias, partnership prefs for overlay | P2 matrix P4–P10 |

---

## Documented disagreements (resolve before marking DRAFT_K8)

| # | Topic | P2 / partner inventory | Prior UI layer | Owner |
| --- | --- | --- | --- | --- |
| **G1** | `stageId` wire format | `sys_*` (prototype) | Was `new`/`paid` in fixtures + observer-stats | **K8 + UI** — align API + parity tests (P2 updated fixtures @ this turn) |
| **G2** | List row vs detail | `ObserverReferredAppeal` vs `ObserverReferredAppealDetail` (+ `history[]`) | Detail views still list type | **UI** when wiring GET `:id` |
| **G3** | `referrerPartnerId` / `receivingPartnerId` | Must be **prof User ids** | Demo strings `partner-alpha`, `viewer` in fixtures only | **K8** seed/docs |
| **G4** | K8 draft location | Expected `docs/contracts/partner-clients-k8-core.*` | — | **K8** — publish or tell P2 path |
| **G5** | Personal meta on list load | Optional `personalMeta` map in GET list (P2 type) | UI uses props only today | **K8** decide embed vs second fetch |

---

## Navigator anchors (read-only)

| SHA | Content |
| --- | --- |
| `8137ddd1` | Partner Clients API unchanged |
| `89fb8e07` | Client profile UI only (publication in progress) |
| Prototype `3dc31836` | SoT for Appeal shape + personal overlay |

Operation evidence: `contract-operation-matrix-8137.md`.

---

## Unresolved dependency (precise)

1. **K8** must push core contract + schema migration **files** (not applied to prod DB).
2. **P2** re-runs diff: K8 fields vs `types.ts`; update `CLIENTS_K8_SOURCE_OF_TRUTH.status` → `DRAFT_K8` only after file exists.
3. **P5/P6** wire proxy when K8 routes have contract tests in navigator (not file presence alone).
4. **User** separate approval before production migration apply.

**Section acceptance:** remains **blocked** — inventory ≠ working API ≠ publication.
