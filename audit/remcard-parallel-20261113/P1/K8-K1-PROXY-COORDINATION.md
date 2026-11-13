# П1 — K8 candidate coordination (proxy + gaps)

**Status:** K8 outputs are **CANDIDATES** — not accepted contract, not release, **no** `remcard-proxy.ts` wire until Root accepts + K2/K5 publish **exact** route paths.

| Artifact | SHA | Repo |
|----------|-----|------|
| Canonical handoff | `16253b841…` (read via GitHub MCP) | `karenavedikyan/remcard-navigator` |
| Schema/core additive | `fc33b4fae859fb692757807c3b27696b66d57558` | same |
| Partner UI base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` | partner-platform |
| Client profile prod (Timeweb) | `89fb8e073c39c8dbd329996940b85c6a86751868` | navigator — historical: `8137ddd1`, `f44732e9` |
| P1 packaging tip | `2fd5c3e1…` | partner-platform |

VM `git clone` of private navigator **404**; inspection via **GitHub MCP** only (not absence of files in partner checkout).

## G6 — Receiving principal identity (Root correction, retract branch-as-partner)

**Verified:** `resolveSpecialistR06Business` @ `89fb8e07` — solo specialist eligible **without** owned org; `ownedOrg` → ineligible.

**K8 candidate defect:** `ClientAppealRecord` @ `fc33b4fa` requires `receivingOrganizationId` + `receivingBranchId`; blocks solo specialist receiving and mis-keys observer grouping if `Branch.id` is used as partner id.

**Canonical (K8 schema source-only):**

- Required: `receivingPartnerUserId` (`User.id`) — prototype `partnerSettings[receivingPartnerId]`.
- Optional nullable: `receivingOrganizationId`, `receivingBranchId` (scope metadata only).
- Active uniqueness: `(certificateId, receivingPartnerUserId)` per prototype `isActiveAppeal`; audit archive/trash vs `findActiveAppeal`.

**P1 pin:** `src/lib/clients-parity/canonical-receiving-principal.json`, `audit/.../RECEIVING-PRINCIPAL-CANONICAL.md`. **No** proxy/gate edits.

**Owners:** **K8** revise additive schema; **K1** receiving auth; **K2** by-partner + list meta; **P2** one DTO.

## K8 contract surface (from `contract.ts` @ fc33b4fa)

- `ClientAppealRecord` — full receiving row includes `privateNotes`, `clientContact` (receiving-only).
- `ClientAppealPersonalOverlay` — K5 `(viewerUserId, appealId)` meta.
- `CLIENT_APPEAL_CERTIFICATE_OPEN_HOOK` → `storeCertificateScan.ts` / `validateCertificateForStore` (**outside P1/K8 write allowlists**).
- Owners: **K8** core+schema, **K1** receiving, **K2** observer GET, **K5** personal mutations, **P1** partner proxy allowlist **after** final paths.

## Root gaps — do not propagate

### G1 — Observer eligibility vs prod gate

**K8 candidate:** `canObserveOwnReferrals` → `BranchEmployee.canViewOwnOperations`.

**Partner prod (57ca):** `OwnerClientsGate` uses `fetchAgentR03Status` / `fetchSpecialistR06Status` / `resolveBusinessOwnerClientsEligibility` — principal **agent/specialist/business** without requiring employment row.

**P1 action:** Document mapping; **do not** proxy until K8 aligns observer auth with **actual** principal eligibility + referrer `Certificate.proUserId` row scope. Receiving CRM **forbidden** for agent UI mode.

| Surface | Read-only reference (partner) |
|---------|-------------------------------|
| Agent/specialist gate | `57ca4680` `OwnerClientsGate.tsx` + `business-clients/gate.ts` |
| K8 access | `fc33b4fa` `clientAppeals/access.ts` |

**Owner fix:** **K8** + **Root** workplace mapping before partner proxy.

### G2 — workingStages / partnerSettings persistence

Prototype: `partnerSettings.workingStages`, refusal/archived stages CRUD.

**fc33b4fa:** no settings/stage persistence in schema (constants only in `stages.ts`).

**Owner:** **K8** additive storage + typed contract; **K1** routes. Observer package must not ship receiving stage editor.

### G3 — Active certificate / appeal uniqueness

Migration: no enforced unique active appeal per `(certificateId, receivingBranchId)`; repository `take:5` + filter risk.

**Owner:** **K8** transaction + predicate from prototype `findActiveAppeal`.

### G4 — Certificate scan → appeal create

Hook in `storeCertificateScan.ts` **not editable** by P1/K8 in this tranche.

**Minimal Root proposal:** After `validateCertificateForStore` success, **K1** POST create bound to server-resolved certificate row (no client-posted partner ids). Route alone insufficient for prototype scan/open journey.

### G5 — Observer DTO (read-only finance / tenant isolation)

`GET` observer responses must **omit** `privateNotes`, `clientContact`, receiving tenant fields. **GET must never write.**

**Owner:** **K2** observer DTO + **P2** adapter typing; **P1** proxy only forwards accepted paths.

## Partner proxy coordination (blocked)

**P1 (20:49 MSK):** K5 paths **whitelisted** in `remcard-proxy.ts` @ navigator `86ac3e35`. K2 GET paths **not** whitelisted until P3 adapter + Root accept.

| Intended owner | Likely upstream path (confirm with K2/K5) | Partner `ALLOWED_ROUTES` |
|----------------|-------------------------------------------|---------------------------|
| K2 | `GET /api/pro/referred-appeals` (name TBD) | add exact regex **after** K2 commit |
| K2 | `GET /api/pro/referred-appeals/:id` | idem |
| K2 | `GET /api/pro/referred-appeals/by-partner/:partnerId` | idem |
| K5 | `PATCH /api/pro/referred-appeals/:id/personal-meta` | idem |
| K5 | `POST /api/pro/referred-appeals/personal-batch` | idem |
| K1 | `/api/pro/client-appeals*` | **not** in agent observer proxy set |
| — | `/api/pro/agent-clients*` | **never** substitute for referred ids |

Rules unchanged: preserve auth headers, no host/env edits, strict method+pattern, no wildcards.

## P1 owned product (unchanged this handoff)

- `ClientsListWorkspace.tsx` — direct `OwnerClientsGate` (57ca snippet on publish).
- `fetch-observer-appeals.ts` — stays `BLOCKED_CONTRACT` until K2 path + DTO accepted.
- Section **unpublished**; `clientsSectionPublishable: false`.

## Smallest integration command (read-only)

```bash
# Partner: no referred routes yet
rg 'referred-appeals|client-appeals' src/lib/remcard-proxy.ts

# Navigator (MCP / gh): read candidate
# src/lib/clientAppeals/HANDOFF.md @ 16253b84
# src/lib/clientAppeals/contract.ts @ fc33b4fa
```

## Remaining dependencies

| Gap | Owner | Next |
|-----|-------|------|
| G1 eligibility | K8/Root | Align `canObserveOwnReferrals` with 57ca principal gate |
| G2 stages settings | K8/K1 | Schema + CRUD |
| G3 active uniqueness | K8 | DB constraint + repo |
| G4 scan hook | Root/K1 | Integration proposal around `validateCertificateForStore` |
| G5 observer DTO | K2/P2 | Typed read model without receiving fields |
| Proxy allowlist | P1 | After K2/K5 final paths + Root accept |
