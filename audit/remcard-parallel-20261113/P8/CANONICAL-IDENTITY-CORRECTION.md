# П8 — Canonical identity correction (source-proven)

**Root inspection (2026-11-13 20:41+ MSK):** `specialistR06Eligibility` — solo specialist eligible **only without** owned `Organization` (`ownedOrg` ⇒ ineligible org_owner); no employment. `requireOwnerClientsContext` already authorizes this principal.

**Verdict (historical):** `fc33b4fa` **REJECTED** for Branch-required identity — **obsolete for current gate**.

**Current K8 tip `6f09c23e`:** identity correction **present in source** (`IDENTITY_HANDOFF.md`, `contract.ts`). This is **not** whole-section acceptance, **not** prod contract, **not** migration approval. Current **NO-GO** driver includes **K8-GAP-7** (purchase projection), not identity FAIL on `fc33`.

---

## Reproduced blocker — solo receiver impossible (K8-GAP-6)

| Source defect | Evidence @ `fc33b4fa` | Effect |
|---------------|------------------------|--------|
| HANDOFF maps `receivingPartnerId` → `Branch.id` + `organizationId` | `HANDOFF.md` Partner ID table | Contradicts prototype `receivingPartnerId` as **principal User.id** for solo specialist |
| `ClientAppealRecord` requires `receivingOrganizationId` + `receivingBranchId` | `contract.ts` | Solo receiver cannot persist without dummy org/branch |
| K1 `soloOwnerReceivingScope` requires owned org (per Root) | candidate K1 (not P8-verified file) | Receiving CRM blocked for eligible solo specialist |
| Active slot keyed only on branch | HANDOFF certificate-open note | Wrong scope for principal-only receiver |

**This is not** permission to create orgs, backfill, or change eligibility rules — **schema/contract correction only** in **new** tables.

---

## Canonical correction (coordinate immediately — K8 sole writer)

1. **`receivingPartnerUserId`** (trusted receiving principal `User.id`) on Appeal model + `contract.ts`.  
2. **`receivingOrganizationId` / `receivingBranchId` — optional** metadata when principal has org/workplace; **no** dummy ids for solo specialist.  
3. **Auth:** existing `requireOwnerClientsContext` / owner principal; agent **always** observer-only. Business owner may attach optional org/branch when it exists.  
4. **Org workplace lists:** may resolve **authorized owner principal** for CRM reads; **never** treat workplace proxy owner as personal observer `viewerUserId`; `write403` unchanged.  
5. **Settings:** `partnerSettings[receivingPartnerId]` keyed by **receiving principal User.id**; org/branch optional scope only.  
6. **Active certificate:** predicate from prototype `isActiveAppeal` (only refused/return inactive); **not** receiver archive UI bucket alone — inspect lifecycle before allowing duplicate active referrals (coordinate K8-GAP-3).  
7. **Observer by-partner metadata:** receiving **User** principal in DTO; **no** mandatory Branch for list identity.  
8. **Consumers:** K1/K2/K5/P2 adapter consume **one** revised K8 contract; **no** posted owner ids; no branch-fabricated principal.

---

## Owner actions

| Owner | Action |
|-------|--------|
| **K8** | Revise additive schema/migration/core only; **no** DB execute |
| **K1/K2/K5** | Hold until revised contract published on K8 branch |
| **P2** | Forward revised DTO fields to partner types (read-only until K8 tip moves) |
| **P8** | Track blocker until integrated; **NO-GO** section publish |
| **Root** | Retract Branch-only `receivingPartnerId` interpretation in integration docs |

---

## Pipeline status

| Artifact | Status |
|----------|--------|
| `fc33b4fa` | **OBSOLETE** (identity defect) |
| `6f09c23e` | Identity **corrected in source**; **GAP-7** blocks accept |
| G7 prod DB | **NOT_STARTED** |
| Whole Clients | **NO-GO** |

**P8 checks:** read-only `contract.ts` + `HANDOFF.md` @ `fc33b4fa` (GitHub MCP). Partner `fetch-observer-appeals` unchanged `BLOCKED_CONTRACT`.
