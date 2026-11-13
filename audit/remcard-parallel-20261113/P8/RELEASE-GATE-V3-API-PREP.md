# П8 — Single release gate (C01–C56) · API/schema prep authorization

**User auth (2026-11-13 20:32 MSK):** prepare API + DB **migrations only** for partner Clients — **not** apply on production DB, **not** deploy, **not** broaden rights/finance/infra. Root integrates + publishes **after** separate user DB confirmation.

**P8 product:** read-only · **Decision:** **NO-GO** for whole-section publication and **NO-GO** for production DB apply **now**.

## Pins

| Role | SHA |
|------|-----|
| Partner publication base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Navigator Clients prep branch | `fc33b4fa` — **REJECTED identity**; revision required per **`CANONICAL-IDENTITY-CORRECTION.md`** |
| Client profile prod (unrelated) | `89fb8e073c39c8dbd329996940b85c6a86751868` — active; **≠** Clients readiness |
| Historical navigator | `8137` — P2 matrix `ac2d4a7b` still valid for gap analysis |
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` (`client-appeals.js`, `observer-personal-list.js`) |
| P2 contract matrix | `ac2d4a7b` → `audit/.../P2/contract-operation-matrix-8137.md` |
| P3 (corrected integration) | `4efb4215` |
| P6 (corrected hooks/C04) | `5b93b6a6` — **not** section acceptance |

**G1 discovery:** **closed** @ 8137 (`ac2d4a7b`). **Do not** reopen “scan missing”.

---

## Early handoff (before broad implementation)

**Navigator / backend owners** — implement per prototype functions, not creative equivalents:

| Artifact | Source | Owner |
|----------|--------|-------|
| `ownReferredAppeals()` list shape | `client-appeals.js` | Navigator: D1–D3 |
| `observerPersonal.meta`, bulk ops | `observer-personal-list.js` | Navigator: D4, P1–P3 |
| Incoming receiving CRM | `client-appeals.js` + `contracts.ts` | Navigator: D5 (agent receiving **excluded**) |
| Decisions D1–D7 | P2 matrix §D | Coordinate with Root before migrate **draft** |
| Proxy allowlist + adapter | `remcard-proxy.ts`, `fetch-observer-appeals.ts` | P5/P6 **after** navigator API exists in source |
| Partner UI assembly | P1 manifest paths @ 57ca | **Root only** |

**Forbidden substitutes (Root + P2 confirmed):** `CertificateUserAlias`, `CertificateProWorkspace`, `LeadAssignment`, **AgentClient** owner CRUD as personal overlay.

**Partner repo @ `4efb4215`:** adapter still **`BLOCKED_CONTRACT`** — prep in navigator does **not** certify deployed routes.

---

## Ordered release gate (one pipeline)

| Step | Gate | Owner | Status | Proof required | Next action |
|------|------|-------|--------|----------------|-------------|
| **G0** | P2 matrix @ 8137 accepted | P2 | **PASS (audit)** | `contract-operation-matrix-8137.md` | Re-run matrix when navigator tip moves post-implementation |
| **G1** | **Schema + source review** (draft migrations/SQL in repo only) | **K8** | **BLOCKED** | Revised contract w/ `receivingPartnerUserId`; optional org/branch | Fix **K8-GAP-6** before any accept; no DB execute |
| **G2** | **Negative safety K3/K4** | Navigator + P2 | **NOT_STARTED** | Written review attached to G1 PR | **K3:** observer read uses **existing** eligibility only (D3); no new public/broader role. **K4:** personal overlay routes cannot PATCH `AgentClient` / cert alias / lead executor fields (D7) |
| **G3** | API implementation in **source** | K8+K1+K2+K5 navigator | **BLOCKED** | **Candidate only:** `fc33b4fa` on `cursor/remcard-k8-acceptance-20261113` — see **`K8-ROOT-SOURCE-GAPS.md`** (5 gaps). Not accepted contract. |
| **G4** | Partner **integration** (proxy + adapter) | P5/P6 | **BLOCKED** | `fetchObserverReferredAppeals` `ok:true` in **mocked** integration test | Wire after G3 source merge; honest UI if still blocked |
| **G5** | **Prototype acceptance** (C26–C48 subset) | P7 + Root QA | **NOT_VERIFIED** | Assembled 57ca shell vs `3dc31836`; not component-only | After G6 assembly |
| **G6** | **Root packaging** on 57ca | Root | **REPRODUCED_FAIL** until assembly | `validate-owner-assembly.log`; diff only allowlist | Cherry-pick UI blobs; preserve gate/route |
| **G7** | **SEPARATE user approval** — production DB apply | User + Root | **NOT_STARTED** | Explicit user confirmation record | **Do not** migrate/seed/backfill until G7 |
| **G8** | Deploy backend + proxy + frontend slice | Root | **FORBIDDEN now** | — | After G7 only |
| **G9** | **Read-only** prod verification | Root QA | **NOT_STARTED** | Real account read; no OTP/writes/estimate `a6ae55eb` | Smoke list/detail; bulk UI with live data |

**C04 (filter/disclosure continuity):** P6 `12aea875` **rejected**; `5b93b6a6` hook-safe router — **IN_PROGRESS / NOT_VERIFIED** at section level (component tests ≠ C04 closed).

---

## C01–C56 dependency (summary)

| Dependency bucket | IDs | Until gate |
|-------------------|-----|------------|
| Receiving CRM (specialist) | C07–C24 | G3 + G7 + G9 |
| Observer data | C26–C34, C39–C40 | G3–G4 + G9 |
| Personal persist | C35–C38 | G1–G4 + G7; **never** AgentClient fake |
| Packaging | C01–C03 | G6 |
| Visual / page | C42–C48, C04 | G5, G9 |
| Agent observer only | C02, C05–C06 | G3 auth + G9 |

**Ledger counts:** see `requirement-ledger-publish-v2.json` — **not remeasured** this pass.

---

## What authorization **does** and **does not** allow

| Allowed now | Still forbidden |
|-------------|-----------------|
| Draft Prisma/SQL + route **source** on navigator branch | `migrate deploy`, reset, seed prod, backfill |
| Contract/interface PRs for review | P8 certifying “deployed” or seeding fake prod data |
| P3/P6 prep on partner branch (owned paths) | P8 product edits; whole-branch merge to main |
| Root planning assembly | Publishing complete section as ready |

---

## NO-GO (explicit)

- Whole Clients section publishable: **NO**
- Production DB apply: **NO** (await **G7**)
- Routes live on prod: **NOT CERTIFIED** by P8
- Component PASS (P3 stack, P6 role-rerender): **≠** G5/G9

## Cursor / owner queue (priority)

1. **Navigator:** G1 draft schema + G3 routes from prototype; attach K3/K4 review.
2. **User + Root:** G7 decision path for D4 storage.
3. **P5/P6:** hold G4 until G3 in source.
4. **Root:** G6 assembly plan; G8/G9 only after G7.
5. **P8:** re-audit ledger when G3 merges (read-only).
