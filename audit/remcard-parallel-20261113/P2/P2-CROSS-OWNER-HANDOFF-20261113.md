# P2 cross-owner handoff — observer Clients (2026-11-13)

| Field | Value |
|-------|-------|
| Owner | P2 (`contracts.ts`, `types.ts`, this audit) |
| Branch tip target | `cursor/2-06bf` after this commit |
| Section READY | **false** — profile `89fb8e07` published ≠ Clients acceptance |

## Frozen navigator SHAs (read-only for all owners)

| Layer | SHA | Wire |
|-------|-----|------|
| K8 identity/schema | `6f09c23e` | `receivingPartnerUserId` required; org/branch optional |
| K2 list HTTP | `3c6ccc19` | `{ appeals, partners, personalMeta, page, limit, total, hasMore, empty }` |
| K8 assembly | `1894569a` | `contract.ts`, `receivingList.ts`, `appealPurchaseProjection` client purchase |
| K1 receiving HTTP | `83f279e8` | `/api/pro/client-appeals/**` — see `K1-83f279e8-receiving-envelope-handoff.md` |
| K2 assembly | `78ce748d` | Observer purchase mirror — converge to K8 projection |
| K5 personal | `6c444487` / wire `86ac3e35` | PATCH `{ meta }`, POST batch `processed[]` |
| P5 client | `a7b111d2` | `observer-personal-api.ts` — real referred-appeals paths |

**Reject:** stale K2 `72193c78` `{ items, … }`; P5 `518f6dd8` personal-overlay paths.

## P1 — proxy only

Allowlist patterns (inventory `CLIENTS_NAVIGATOR_ACTUAL_HTTP.p1MustAllowPatterns`):

- `GET ^/api/pro/referred-appeals$`
- `PATCH ^/api/pro/referred-appeals/[\\w-]+/personal-meta$`
- `POST ^/api/pro/referred-appeals/personal-batch$`

Until P1 lands, P5 returns `blocked_contract` for proxy — not fake persistence.

## P3 — list fetch + workspace

1. **HTTP type:** `K2ObserverReferredAppealsHttpResponse` in `types.ts` — field `appeals`, not `items`.
2. **Normalize to:** `ObserverAppealsLoadResult` ok branch (`appeals`, `partners`, `personalMeta`, pagination).
3. **Partner cards:** UI key = `receivingPartnerUserId` from appeal rows; `partners[]` @ 3c6ccc19 is **interim** (`K2ObserverPartnerSummaryInterim`) until **GAP-K8-P**.
4. **Display:** solo receiving User when `receivingBranchId` null — no Branch metadata requirement.
5. **Personal HTTP:** import `@/lib/clients-parity/observer-personal-api` from P5 tip `a7b111d2` — **do not** duplicate `observer-personal-api.ts` on P3 branch.
6. **Forbidden:** localStorage/demo fixtures; AgentClient CRUD; competing list envelope.

`fetch-observer-appeals.ts` remains BLOCKED until P1 + wire verified in prep env.

## P4 — observer detail/history

Read-only observer routes only; no `receiving-appeals-api`.

- Detail wire: `ObserverReferredAppealDetailHttp` — `timeline: ObserverPublicTimelineEvent[]` only (`at`, `text`)
- Prototype: `publicReferrerTimeline` / `CLIENTS_OBSERVER_PUBLIC_TIMELINE` — not raw K1 history
- List inclusion: `ownReferredAppeals` scope — **ignore receiver `deletedAt`** (**GAP-K2-OBSERVER-DELETED-AT**)
- Personal bucket: K5 overlay — never receiver CRM trash
- Handoff: `audit/.../P4-observer-privacy-timeline-handoff.md`

## P5 — personal client (owned module)

- Module: `src/lib/clients-parity/observer-personal-api.ts` @ `a7b111d2`
- `mapProjectionToPartnerMeta`: bucket/alias/tag/note; **version** from PATCH response; list overlay may lack version until K2 DTO extended
- **Restore/trash:** server stores `beforeTrashBucket`; wire omits `beforeTrash` (**GAP-K5-I**) — rely on `action: restore` + refresh `{ meta }`
- Bulk: map UI ops via `OBSERVER_P5_TO_K5_BATCH_ACTION`

## P6 — receiving CRM only

- `receiving-appeals-api.ts` + receiving UI — **never** observer list stats/filter/detail/personal-meta
- Wire: **`/api/pro/client-appeals`** (no `/receiving` suffix); stage via **`PATCH …/:id/stage`**
- Expect `ReceivingAppealsAccessWire` on list once **GAP-K1-HTTP-ACCESS** closes; until then only `readOnly` on JSON
- List target: `bucket`, `sourceFilter`, `stageKey` per K8 `receivingList.ts` — not `archived=1` only

## P2-only edits

Others must not edit `contracts.ts` / `types.ts`. Interface changes → update this handoff + gap inventory.

## Unresolved (blocks full-section acceptance)

- **GAP-K8-N** / BLK-CLIENTS-PURCHASE-READ
- **GAP-K8-O/P** observer DTO + partner distinct principal
- **GAP-K5-I** beforeTrash on wire
- **GAP-K8-L** active certificate vs archive/trash
- P1 proxy unwired; prod DB migration — separate user approval

## Contract matrix

`audit/remcard-parallel-20261113/P2/contract-operation-matrix-8137.md` (ac2d4a7b).
