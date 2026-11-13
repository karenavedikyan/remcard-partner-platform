# P4 ↔ K8/K1/K2 alignment (Root inspection 2026-11-13 20:41 MSK)

**K8 candidates (NOT accepted):** `remcard-navigator` @ `16253b84` handoff + `fc33b4fa` schema/core  
**Partner tip (UI):** post-commit on `cursor/remcard-p4-acceptance-20261113`  
**P2 matrix:** partner `ac2d4a7b` — `audit/remcard-parallel-20261113/P2/contract-operation-matrix-8137.md`

## Canonical source (read-only)

- `remcard-navigator:src/lib/clientAppeals/contract.ts` @ `fc33b4fa`
- `remcard-navigator:src/lib/clientAppeals/HANDOFF.md` @ `16253b84`

## Partner UI mirror (owned)

- `src/components/clients/receiving/detail-contract-alignment.ts` — structural mirror + K1→UI mappers
- `ReceivingAppealHistory.tsx` — `referrer-public` projection (prototype `publicReferrerTimeline`)
- `ObserverClientDetailView.tsx` — optional `publicTimeline` from **K2 only**; otherwise `BLK-OBSERVER-REFERRED`
- Observer back resolver unchanged: `observerClientBackFrom` / `export-contract-v3.md`

## Field mapping

| K8 `ClientAppealRecord` | Receiving UI (`ReceivingAppealDetailView`) | Observer UI |
| --- | --- | --- |
| `clientDisplayName` | `clientName` | `clientName` via parity adapter |
| `clientContact` | shown | **forbidden** (K2 must strip) |
| `privateNotes` | receiving only (future CRM) | **forbidden** |
| `history[]` | `receiving-full` | K2 → `publicTimeline[]` only |
| `stageKey` | `stageId` + resolved `stageLabel` | `stageLabel` text |
| `receivingBranchId` | P6 resolves display name | `receivingPartnerId` mapping via P2 |

## Root-flagged K8 gaps (do not propagate)

1. **Observer eligibility:** K8 `canObserveOwnReferrals` → `canViewOwnOperations` on **any** grant branch; partner prod may admit eligible agent/specialist via `ownerClientsAccess` without employment. **K8 must align with existing `prof-i-permissions` / owner gates** before routes ship — not a new employment requirement.
2. **Working stages:** `fc33b4fa` has no `partnerSettings.workingStages` persistence — K8 must add scoped storage before K1 stage CRUD; UI must not fake settings from constants.
3. **Active certificate uniqueness:** enforce prototype `findActiveAppeal` predicate in DB transaction — ordinary index + `take:5` is insufficient.
4. **Scan hook:** appeal create must chain `storeCertificateScan.ts` `validateCertificateForStore` — **do not edit** scan file from P4; Root integrates POST create after validation.
5. **GET never writes** — K2 detail must not expose `privateNotes`/`clientContact`; purchase amounts read-only projections only.

## Store-certificate integration (Root minimal proposal)

1. After successful `validateCertificateForStore`, K1 POST create uses `ClientAppealCreateFromCertificateInput` (ids from DB row, not body).
2. Partner proxy adds **read** routes only until create wired.
3. Partner UI keeps blocked states until proxy returns 200 + real rows — no fixture timeline in product.

## Remaining (not full-section)

| Item | Owner |
| --- | --- |
| Accepted K8 contract | Root + user DB approval |
| K1 receiving routes + stage PATCH | K1 |
| K2 observer GET + safe projection | K2 |
| P2 proxy adapter DTO | P2 |
| P6 workspace wiring | P6 |
