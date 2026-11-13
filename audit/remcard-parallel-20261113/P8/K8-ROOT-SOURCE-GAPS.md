# П8 — K8 navigator source inspection (Root handoff, read-only)

**Status:** K8 @ `fc33b4fa` / handoff @ `16253b84` are **CANDIDATES** — **REJECTED** for Branch-required identity (@ `fc33b4fa`); see **`CANONICAL-IDENTITY-CORRECTION.md`**. Not accepted contract or release.  
**Profile prod `89fb8e07`:** Timeweb active — **unrelated** to Clients section readiness.  
**Historical:** `8137` / `f447` navigator refs — superseded for **Clients API prep** lineage.

**Repo:** `karenavedikyan/remcard-navigator` · branch `cursor/remcard-k8-acceptance-20261113`  
**Read refs:** `16253b84` (canonical handoff) → `fc33b4fa` (additive schema/core)  
**Files inspected:** `src/lib/clientAppeals/HANDOFF.md`, `contract.ts`, `access.ts` @ `fc33b4fa` (GitHub MCP)

**P8 product:** none · **DB/migrate/deploy:** **not** authorized · **G7 user DB approval:** still mandatory

---

## Early contract/interface handoff (for K1/K2/K5/P2)

| Consumer | Must use | Must not |
|----------|----------|----------|
| **K1** | `ClientAppealRecord`, receiving mutations after settings exist | Invent `workingStages` in constants only |
| **K2** | Observer DTO from `contract.ts`; **strict read**; no `privateNotes`/`clientContact` on observer GET | Tenant leakage |
| **K5** | `ClientAppealPersonalOverlay` | AgentClient PATCH substitute |
| **P2** | Forward adapter field names to partner `types.ts` after K8 fixes G1–G5 | Treat K8 as shipped API |
| **Root** | Merge when gates green; **separate** prod DB apply | Whole K8 branch transfer |

**Certificate open journey:** see `CLIENT_APPEAL_CERTIFICATE_OPEN_HOOK` → `storeCertificateScan.ts` (**out of K8 allowlist**).

---

## Six reproduced source gaps (owner blockers — not section acceptance)

### K8-GAP-6 — **CRITICAL** Solo receiving principal (source-proven)

| | |
|---|---|
| **Root source** | `specialistR06Eligibility` — solo specialist **without** owned org is eligible; `requireOwnerClientsContext` matches |
| **K8 defect** | Required `receivingOrganizationId` + `receivingBranchId`; HANDOFF maps receiver → `Branch.id` |
| **Impact** | Receiving «Клиенты у меня» **impossible** for eligible solo specialist |
| **Owner** | **K8** (schema/core only) |
| **Next action** | Apply **`CANONICAL-IDENTITY-CORRECTION.md`**; `receivingPartnerUserId` + optional org/branch |

## Prior five gaps

### K8-GAP-1 — Observer eligibility vs existing partner gates

| | |
|---|---|
| **Reproduced in** | `access.ts` `canObserveOwnReferrals` → requires `BranchEmployee` + `canViewOwnOperations` |
| **Actual prod expectation** | Partner `ownerClientsAccess` / gates: eligible **principal agent/specialist** without employment row; agent **only** observer at partners |
| **Risk** | Denying observer to entitled principals or inventing employment requirement |
| **Owner** | **K8** (+ align with read-only `ownerClientsGate` semantics on partner) |
| **Next action** | Map **existing** `resolveOwnerClientsMode` / R03 / R06 eligibility to server `resolveAppealAccess`; document workplace vs principal path; **no** bare PRO role guess; receiving **forbidden** for agent |

### K8-GAP-2 — Partner settings / working stages persistence

| | |
|---|---|
| **Prototype** | `partnerSettings.workingStages`, `refusalReasons`, `archivedStages` + add/rename/remove/restore |
| **fc33 schema** | **No** settings/stage persistence tables |
| **Impact** | **K1 cannot** ship working stage CRUD from constants |
| **Owner** | **K8** (additive scoped storage + types in contract) |
| **Next action** | Add typed settings model + migration draft; K1 consumes **final** contract — no localStorage |

### K8-GAP-3 — Active certificate / appeal uniqueness

| | |
|---|---|
| **Prototype** | `findActiveAppeal` — one active per `(certificateId, receivingBranchId)` |
| **fc33** | Ordinary index; repo `take:5` + filter — race / missed active |
| **Owner** | **K8** (schema + transaction predicate) |
| **Next action** | Define active predicate from prototype; **unique partial index** or transactional create in source |

### K8-GAP-4 — Scan → appeal creation integration

| | |
|---|---|
| **Hook** | `storeCertificateScan.ts` / `validateCertificateForStore` — **outside** K8 write allowlist |
| **Impact** | New POST route alone ≠ prototype successful-scan/open journey |
| **Owner** | **Root** (integration proposal) · **K1** (route after validation) |
| **Next action** | Root returns **minimal** wiring proposal; K8 **must not** edit scan file |

### K8-GAP-5 — Observer DTO / finance leakage + GET write

| | |
|---|---|
| **Requirement** | Observer GET **never** writes; no receiving `privateNotes` / `clientContact` / foreign tenant fields |
| **Owner** | **K2** (routes) + **K8** (contract split DTOs) |
| **Next action** | Explicit `ClientAppealObserverView` vs receiving view in `contract.ts`; audit K2 handlers before accept |

---

## Release gate impact (G0–G9)

| Gate | Before K8 fixes |
|------|-----------------|
| G1 schema draft | **IN_PROGRESS (candidate)** — blocked by GAP-2, GAP-3 |
| G2 K3/K4 safety | **BLOCKED** until GAP-1, GAP-5 |
| G3 API source | **BLOCKED** — candidate lib only; GAP-1–4 open |
| G4 partner integration | **BLOCKED** |
| G7 prod DB | **NOT_STARTED** |
| **Section publishable** | **NO** |

---

## NO-GO (explicit)

- Accept K8 handoff as production contract: **NO**
- Apply migration / deploy: **NO**
- Profile `89fb8e07` release ≡ Clients ready: **NO**
- Component/partner tests ≡ section: **NO**

---

## P8 checks this pass

| Check | Result |
|-------|--------|
| GitHub read `HANDOFF.md`, `contract.ts`, `access.ts` @ `fc33b4fa` | **OK** |
| Partner `fetch-observer-appeals` @ `4efb4215` | Still `BLOCKED_CONTRACT` (read-only) |
| Vitest | **not run** (prioritize gap ledger) |
