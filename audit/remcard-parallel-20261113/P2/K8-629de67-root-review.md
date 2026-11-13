# Root review ↔ P2 reconcile @ K8 `629de67e` (CANDIDATE)

**Navigator:** `cursor/remcard-k8-acceptance-20261113` @ `629de67e4ea4737eb7a855e4ee9808bcd8f8d4d8`  
**Confirmed improvements (not acceptance):** `PartnerClientAppealPartnerSettings`, partial unique index `PartnerClientAppeal_active_certificate_branch_uidx`, `isActiveAppealStage` (paid still active), SQL predicate in `findFirst` (no `take:5`), `eligibility.ts` ties to `ownerClientsAccess`.

**No DB apply. No deployment.**

---

## Remaining gaps (Root) — **UNRESOLVED**

| Id | File | Issue |
| --- | --- | --- |
| **A** | `repository.ts` | `createCertificateAppealIfNoneActive`: on P2002, queries `tx` after failed insert — unsafe on aborted PostgreSQL transaction |
| **B** | `eligibility.ts` | `canObserverListIncludeAppeal(ctx, appeal)` — must bind **viewerUserId**, not only `ctx.ownerUserId` (org employer ≠ employee personal rows) |
| **C** | `access.ts` | `resolveAppealAccess(..., options?)` — defaults allow receiving when options omitted; require explicit trusted context |
| **D** | `dto.ts` | `Omit` blacklist — K2 must emit **`ObserverAppealK2WireDto`** allowlist (`types.ts`) |
| **E** | migration settings | `organizationId` unique vs prototype `partnerSettings[receivingPartnerId]` (branch-level pipeline) |

---

## P2 decision E (settings scope)

| Layer | Key |
| --- | --- |
| Prototype `3dc31836` | `partnerSettings[receivingPartnerId]` — `getWorkingStage(appeal.receivingPartnerId, stageId)` |
| K8 `629de67` | `PartnerClientAppealPartnerSettings.organizationId` — all branches under org share JSON stages |
| **Adapter until resolved** | List/group UI by **`receivingBranchId`**; settings fetch by **`receivingOrganizationId`** from appeal row; **do not** use org owner `User.id` as partner card id |

If product requires per-branch pipelines (prototype fidelity), K8 needs **`receivingBranchId`** settings key or branch override — **K1 blocked** on ambiguous org-only CRUD.

---

## Stable partner-platform adapter (P5/P6)

- **Receiving partner identity:** `receivingBranchId` → UI `receivingPartnerId` / `ObserverPartnerMeta.id`
- **Referrer identity:** `referrerProUserId` → UI `referrerPartnerId` (User.id)
- **Wire allowlist:** `ObserverAppealK2WireDto` in `src/lib/clients-parity/types.ts`
- **Map:** `OBSERVER_APPEAL_ADAPTER_MAP` in `contracts.ts`
- **Forbidden on observer wire:** `privateNotes`, `clientContact`, `createdByUserId`, any future receiving-only field not in allowlist

Machine handoff: `k8-adapter-handoff.json`.

---

## Improved vs `fc33b4fa` (closed items — still not “READY”)

| Prior gap | @ `629de67` |
| --- | --- |
| Employment-only observer | Addressed in `eligibility.ts` + access comments; **B/C remain** |
| Settings missing | Table added; **E remains** |
| Active predicate / index | Fixed; **A remains** (tx recovery) |
| Scan hook | `CERTIFICATE_INTEGRATION.md` + `createCertificateAppealIfNoneActive`; Root/K1 still own wiring |

**Section acceptance:** blocked until A–E fixed + K1/K2/K5 HTTP + proxy + prod DB approval.
