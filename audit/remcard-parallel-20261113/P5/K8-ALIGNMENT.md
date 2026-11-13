# П5 ↔ K8 canonical alignment (read-only inspection)

**Navigator:** `remcard-navigator` @ `fc33b4fae859fb692757807c3b27696b66d57558` (parent handoff `16253b84`).  
**Partner tip (this branch):** updates `observer-personal-api.ts` only — **not** accepted backend.

## Wired client paths (П5)

| Operation | HTTP | Body |
| --- | --- | --- |
| Single save | `PATCH /api/pro/client-appeals/:appealId/personal-overlay` | `PersonalMetaPatch` + `expectedVersion?` |
| Batch tag/bucket | `POST /api/pro/client-appeals/personal-overlay/batch` | `PersonalBatchOperation` |

Response overlay = `ClientAppealPersonalOverlayDto` → `mapOverlayToPartnerMeta` (no `privateNotes` / `clientContact`).

Outcomes: `full` | `partial` | `conflict` (409) | `blocked_contract` | `error`; `personalMutationPreserveSelection` true on partial/error/conflict.

## Root K8 gaps — П5 must NOT amplify

1. **Eligibility:** K8 `canObserveOwnReferrals` needs `canViewOwnOperations` on a grant. Partner gate must match **actual** principal agent/specialist eligibility (`ownerClientsAccess` read-only) — not bare PRO role, not employment-only guess.
2. **Settings/stages:** No `workingStages` persistence in fc33 — `ReceivingBulkActions` stays `contractState=blocked`; K1/K8 scoped storage required.
3. **Active certificate uniqueness:** K8 `take:5` + filter — navigator must enforce transaction-level uniqueness; П5 does not create appeals.
4. **Scan hook:** `storeCertificateScan.ts` — integration proposal to Root only; П5 does not edit.
5. **Strict observer DTO:** P2 adapter must strip receiving-only fields from observer list; П5 client never requests CRM PATCH.

## Missing for live mutations

| Piece | Owner |
| --- | --- |
| `src/lib/clientAppeals/personal.ts` + routes | Navigator **K5** |
| P1 proxy allowlist | **P1** |
| Observer list `appealId` + embedded overlay | **K2** + **P3** |
| Parent wire `onSave` / versions / refetch | List owner |
| Migration apply | Root + user DB confirm |

## Legacy

`referred-appeals/*personal-meta` in early П5 draft — **deprecated**; use client-appeals overlay only.
