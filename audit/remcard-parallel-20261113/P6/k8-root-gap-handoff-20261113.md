# П6 — K8/K1 receiving gap handoff (Root source inspection 20:41 MSK)

## K8 contract read status — **ACCESS BLOCKED**

| Ref | Expected path | Result |
|-----|---------------|--------|
| Branch `cursor/remcard-k8-acceptance-20261113` | — | `git ls-remote origin` → **no ref** |
| `fc33b4fae859fb692757807c3b27696b66d57558` | `src/lib/clientAppeals/contract.ts` | GitHub API **422 No commit**; `git fetch` **failed** |
| `16253b84` | `src/lib/clientAppeals/HANDOFF.md` | **unavailable** |

**П6 action:** DTOs in `receiving-appeals-api.ts` remain **prototype-aligned placeholders** until K8 pushes; then replace with `import type` re-export from `contract.ts` (no local competing schema).

**Verified read-only (this repo):** `OwnerClientsGate.tsx`, `receiving-appeals-api.ts`, prototype `client-appeals.js` @ `3dc31836` via GitHub.

---

## Root gap register → owners

### 1. Eligibility: `canObserveOwnReferrals` vs production gate

| Layer | Actual behavior (57ca4680 pin family) |
|-------|--------------------------------------|
| UI gate | `OwnerClientsGate`: agent R03 eligible **first**; specialist R06; business `ORG_OWNER` + STORE/COMPANY (`resolveBusinessOwnerClientsEligibility`) |
| K8 candidate risk | `access.ts` tying observer to `BranchEmployee.canViewOwnOperations` **≠** UI principal eligibility |

**П6 requires K8/K1 to map:** existing `OwnerClientsAccessMode` + **same** eligibility as gate (no new employment requirement). **Agent:** observer only, **receiving forbidden** (workspace router `accessMode === "agent"` → no tabs).

**Owner:** K8 `access.ts` + K1 route guards — must align with `OwnerClientsGate`, not replace.

### 2. `partnerSettings` persistence

Prototype: `workingStages`, `refusalReasons`, `archivedStages` with add/rename/remove/restore (`partnerSettingsMerged`).

Root: fc33b4fa schema **without** settings rows → K1 cannot serve full `WorkingStagesEditor` from constants.

**П6:** `isReceivingSettingsMaterialized()` — UI must not claim settings PASS until K8 storage + GET/POST working-stages return persisted data.

**Owner:** K8 additive migration + typed contract; K1 routes; П6 editor wires only after materialized settings.

### 3. Active certificate uniqueness (`findActiveAppeal`)

Prototype filters active by `certificateId` + `receivingPartnerId` + active stage set.

Root: ordinary index + `take:5` filter risks missed duplicates under concurrency.

**П6:** `POST /api/pro/client-appeals` create-from-cert must return **409** (or equivalent) when active exists — typed in K8 contract, not UI guess.

**Owner:** K8 repository/transaction + K1 handler.

### 4. Certificate scan → appeal (outside allowlists)

`storeCertificateScan.ts` create hook — **read-only** reference (`docs/REUSE-MAP.md` → navigator `storeCertificateScan.ts`).

**Minimal integration proposal for Root (not implemented by П6):**

1. Successful scan preview returns `certificateId` + client snapshot.
2. New **allowed** BFF route e.g. `POST /api/pro/client-appeals/from-certificate` (idempotent on cert+receiver).
3. Handler delegates to same domain service as manual create; enforces gap #3 predicate.
4. UI scan page (`p.81`…) navigates to detail/list on success — P4/P6 routes only after proxy ready.

**Owner:** K1 route + K8 service; navigator scan owner for hook call (separate allowlist).

### 5. Observer vs receiving DTO boundary

- **Receiving detail** (`ReceivingAppealDetail`): may include `privateNotes`, `clientContact`, `history` for **receiving owner** only.
- **Observer referred list** (P2): must **not** expose receiving tenant fields; GET **read-only**, no write side effects on load.

**П6:** list row type strips contact/notes; detail API separate (`fetchReceivingAppealDetail`).

---

## П6 preserved (not regressed)

- Hook order: `5b93b6a6` router (`ClientsDirectionWorkspace.tsx` @ `b99680b6`+).
- Lazy observer mount + C04 keep-alive (same role).
- `ReceivingAppealsWorkspace` → blocker until `isReceivingAppealsProxyReady()`.

---

## Unresolved for full Clients section

| Item | Owner | Next action |
|------|-------|-------------|
| K8 contract on origin | K8 | Push branch; П6 re-sync types |
| P1 proxy allowlist | P1/K1 | `client-appeals*` patterns |
| Settings storage | K8 | Migration candidate **not** applied (user separate DB OK) |
| Scan→appeal journey | K1 + navigator | Hook proposal above |
| Observer API | K1/K8 | `referred-appeals` per P2 |

**No READY** for whole section; component tests ≠ page acceptance.
