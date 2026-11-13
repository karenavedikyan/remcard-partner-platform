# K1 receiving HTTP envelope — P2 freeze for P1/P6/K1

| Field | Value |
|-------|-------|
| Assembly | K8 `1894569a` + K1 `83f279e8` + K2 `78ce748d` + K5 `6c444487` |
| P2 types | `ReceivingAppealsAccessWire`, `K1ReceivingListHttpTarget`, … in `types.ts` |
| P2 contract | `CLIENTS_RECEIVING_HTTP_CONTRACT` in `contracts.ts` |

## Paths (actual — not `/receiving` suffix)

| Method | Path | Owner |
|--------|------|-------|
| GET/POST | `/api/pro/client-appeals` | K1 list + manual create |
| GET | `/api/pro/client-appeals/:id` | K1 detail |
| PATCH | `/api/pro/client-appeals/:id/stage` | K1 stage — **no POST stage** |
| POST | `/api/pro/client-appeals/batch` | K1 bulk |
| GET/POST/PATCH/DELETE | `/api/pro/client-appeals/working-stages` | K1 settings grid |

## List GET — actual @ 83f279e8

**Query today:** `archived=1`, `q`, `limit`, `cursor` (+ trusted `branchId` via gate, not body).

**200 today:**

```json
{ "appeals": [], "nextCursor": null, "tab": "incoming", "readOnly": false }
```

**P6 requires (K1 assigned):** same rows plus `bucket`, `sourceFilter`, `stageKey`, and `access`:

```ts
// types.ts — ReceivingAppealsAccessWire
{
  mode: "receiving",
  actorUserId,
  ownerUserId,
  receivingPartnerUserId,
  receivingOrganizationId,
  receivingBranchId,
  readOnly,
  accessMode: "specialist" | "business" | "org_workplace_read"
}
```

**K8 lib target query:** `bucket active|archive|trash`, `sourceFilter all|manual|cert`, `stageKey`, `search`, `cursor`, `take` (`receivingList.ts` @ 1894569a). Lib returns `{ items, nextCursor }` — HTTP keeps **`appeals`** alias.

## Detail GET

`{ appeal, revision, history, workingStages, refusalReasons, readOnly }` — add `access` when list gap closes.

History: `authorLabel` on wire → P6 maps to prototype `author`.

## Stage PATCH (frozen)

- **Path:** `PATCH .../:id/stage` only
- **Body:** `stageKey` (or `stageId` alias), `expectedRevision?`, `refusedReason?`, `shippedAt?`
- **200:** `{ appeal, revision }`
- **K8:** `canTransitionToStage` + `projectAppealPurchaseFields` for paid guard — no settlement mutation in route

## Batch POST

| | Actual @ 83f279e8 | Target (K8 + prototype) |
|--|-------------------|-------------------------|
| actions | `archive`, `unarchive`, `bulk-edit` | + `delete` (trash), `restore` |
| response | `{ updated, failures? }` | `{ updatedIds, skippedIds?, failures[] }` per id |

K8 primitive: `applyReceivingBulkLifecycle` kinds `archive|delete|unarchive|restore`.

## Working stages

- **GET 200:** `{ settings }` where settings keyed by **`receivingPartnerUserId`** (not org-only — reject stale K1_RECEIVING_API.md org lines).
- **POST:** `kind: workingStage | refusalReason`
- **PATCH:** rename or `restore: true`
- **DELETE:** `?stageId=` archives stage (prototype grid)

## P1 proxy

Allowlist: `CLIENTS_RECEIVING_HTTP_CONTRACT.p1AllowlistPatterns` (+ observer routes from prior handoff).

## P6 client

Owns `receiving-appeals-api.ts` only — map wire DTOs; never observer personal/list.

## Stale K8 doc

`CROSS_OWNER_WIRE.md` @ 1894569a still references K2 `72193c78` `{ items }` and Branch.id partners — **do not implement**. Use `CLIENTS_LIST_RESPONSE_CONTRACT.k2HttpObserverActual` and P2 cross-owner handoff.

## Section READY

**false** — principal/access/bucket/batch gaps, proxy, prod DB.
