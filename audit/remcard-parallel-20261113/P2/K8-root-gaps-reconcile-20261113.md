# P2 ↔ K8 candidate reconcile (Root inspection 2026-11-13 20:41 MSK)

**Status:** K8 navigator drafts are **CANDIDATES**, not accepted release. **No** DB apply, deploy, or route READY.

| Artifact | SHA | Branch |
| --- | --- | --- |
| Handoff docs + `contract.ts` | `16253b84c3d0d35ad0978cb2bde1ccad1d725141` | `cursor/remcard-k8-acceptance-20261113` |
| Schema + core lib | `fc33b4fae859fb692757807c3b27696b66d57558` | same |
| Client profile prod select (unrelated API) | `89fb8e073c39c8dbd329996940b85c6a86751868` | — |
| Partner-platform P2 inventory tip (pre-sync) | `77dac8ae` → *this commit* | `cursor/2-06bf` |

**K8 canonical module:** `remcard-navigator/src/lib/clientAppeals/{contract.ts,HANDOFF.md,access.ts,repository.ts,stages.ts}`.

---

## Early handoff — stable HTTP names (consume, do not fork)

K8 uses **one** persistence entity `PartnerClientAppeal`. HTTP surface is split by owner (no routes in fc33 yet).

| Owner | Methods | Path (canonical for K1/K2/K5 + P5 proxy) |
| --- | --- | --- |
| **K2** observer read | `GET` | `/api/pro/client-appeals/observer` |
| **K2** | `GET` | `/api/pro/client-appeals/observer/:appealId` |
| **K2** | `GET` | `/api/pro/client-appeals/observer/by-branch/:receivingBranchId` |
| **K5** overlay | `PATCH` | `/api/pro/client-appeals/observer/:appealId/personal-meta` |
| **K5** bulk | `POST` | `/api/pro/client-appeals/observer/personal-batch` |
| **K1** receiving | `GET/POST` | `/api/pro/client-appeals/receiving` |
| **K1** | `PATCH` | `/api/pro/client-appeals/receiving/:appealId` |
| **K1** | `POST` | `/api/pro/client-appeals/receiving/batch` |
| **K1** stages | `GET/POST` | `/api/pro/client-appeals/receiving/working-stages` |

**Deprecated** (P2 pre-K8 inventory only): `/api/pro/referred-appeals*` — map in proxy to **observer** paths above.

**GET must not write** (all K2 GETs).

---

## Partner-platform adapter DTO (P5/P6 / `types.ts`)

Map K8 `ClientAppealRecord` → UI `ObserverReferredAppeal` in adapter only:

| K8 / DB | Partner observer DTO | Notes |
| --- | --- | --- |
| `id` | `id` | |
| `clientDisplayName` | `clientName` | |
| `stageKey` | `stageId` | `sys_*` |
| `referrerProUserId` | `referrerPartnerId` | **User.id**, not branch |
| `receivingBranchId` | `receivingPartnerId` | **Branch.id** (prototype “partner” row) |
| `certificateId` | `certificateId` | |
| `interest`, `clientCity`, `budgetHint`, … | same | optional |
| `history[]` | detail only | `ClientAppealHistoryEvent` |
| `privateNotes`, `clientContact` | **OMIT** on observer responses | Root gap #5 |

Personal overlay: K8 `beforeTrashBucket` (enum ACTIVE/ARCHIVED/TRASH) → lowercase `beforeTrash` in JSON at API boundary (K5).

---

## Root gaps — **UNRESOLVED** until K8/K1 fix

### GAP-K8-1 — Observer eligibility (`access.ts`)

**Candidate:** `resolveAppealAccess` + `canObserveOwnReferrals` → requires `BranchEmployee.canViewOwnOperations` on **some** branch grant.

**Production fact:** `src/lib/ownerClientsAccess.ts` @ 8137 allows **principal agent / specialist** CRM (`resolvePrincipalAgentBusiness`, `resolveSpecialistR06Business`) **without** branch employment.

**Required:** Observer for eligible **agent** must use **existing** principal eligibility + `referrerProUserId === viewer.id`. Must **not** require employment-only flag or bare PRO.

**Owner:** K8 (+ K2 route gate). **Agent receiving CRM still forbidden.**

---

### GAP-K8-2 — `partnerSettings` / working stages persistence

**Prototype:** `partnerSettings[receivingPartnerId].workingStages`, `refusalReasons`, `archivedStages` with add/rename/remove/restore (`client-appeals.js`).

**fc33 schema:** no `PartnerClientAppealWorkingStage` / settings table — only `stageKey` on appeal.

**Impact:** K1 cannot implement working-stages CRUD from constants alone.

**Owner:** K8 additive schema + typed contract; K1 routes.

---

### GAP-K8-3 — Active certificate appeal uniqueness

**Prototype `findActiveAppeal`:** active iff `stageId !== REFUSED && stageId !== RETURN` (PAID/SHIPPED still block second open).

**Candidate `stages.ts`:** `isActiveCertificateAppealStage` excludes **PAID** as well — **mismatch**.

**Candidate `repository.ts`:** `findMany` `take: 5` + filter; migration has **ordinary** index on `(certificateId, receivingBranchId)` — **no** partial unique constraint.

**Required:** Active predicate = prototype; enforce **at most one** active cert appeal per `(certificateId, receivingBranchId)` in transaction (DB partial unique index or serialized create).

**Owner:** K8.

---

### GAP-K8-4 — Certificate scan → appeal create (outside K8 allowlist)

**Hook:** `src/lib/storeCertificateScan.ts` → `validateCertificateForStore` — **not editable** in K8 tranche.

**Minimal Root integration proposal (P2 forwards only):**

1. After successful validation response, orchestration layer (K1 or Root-owned store route) calls `createAppealFromCertificate` inside same user session.
2. Pre-check: `findActiveCertificateAppeal(certId, receivingBranchId)` — if active, return existing id (idempotent open), do not create duplicate.
3. Bind `referrerProUserId` from loaded `Certificate.proUserId`, never body.
4. Append history event “Новое обращение” mirroring prototype `pushHistory`.

**Owner:** Root + K1; K8 supplies repository only.

---

### GAP-K8-5 — Observer read DTO strip

**Candidate `ClientAppealRecord` type** includes `privateNotes`, `clientContact` (receiving CRM).

**Required:** K2 serializer **`ObserverClientAppealDto`** must exclude tenant fields + finance write paths; purchase fields read-only projections only where product allows.

**Owner:** K2; P2 documents adapter strip in `types.ts`.

---

## P2 inventory alignment

After K8 fixes GAP-K8-1…5 and K1/K2/K5 ship routes: update `CLIENTS_CANONICAL_ROUTES[*].status` to `DRAFT_K8` / `IMPLEMENTED_UNVERIFIED` **only when HTTP handlers exist** — not when migration file exists alone.

**Section acceptance:** still **blocked** (no live API, proxy unwired, prod migration not user-approved).
