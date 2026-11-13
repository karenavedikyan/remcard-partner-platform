# K5 actual routes (navigator `86ac3e35`) ↔ П5 client

## HTTP (source of truth)

| Operation | Method | Path |
| --- | --- | --- |
| Patch meta / single move / single restore | `PATCH` | `/api/pro/referred-appeals/:id/personal-meta` |
| Batch tag / move / restore | `POST` | `/api/pro/referred-appeals/personal-batch` |

**PATCH body:** `{ expectedVersion?, alias?, tag?, note?, action?: move|restore, target?: archived|trash }`  
**Response:** `{ meta: PersonalMetaProjection }`

**POST body:** `{ action: move|restore|setTag, ids, target?, tag?, mode?: atomic|best_effort, expectedVersions? }`  
**Response:** `{ action, mode, processedCount, skippedCount, processed[], skipped[{appealId, reason}] }`

## П5 mapping

| UI | Client call |
| --- | --- |
| Save single | `saveObserverPersonalSingle` → PATCH fields |
| Bulk tag | `saveObserverPersonalBulkTag` → POST `setTag`, default `best_effort` |
| Archive / trash confirm | `moveObserverPersonalBucket` → PATCH or POST `move` + `target` |
| Restore confirm | `restoreObserverPersonal` → PATCH or POST `restore` |

## Errors (not lumped as proxy blocked)

`401` UNAUTHORIZED, `403` INELIGIBLE, `404` NOT_FOUND, `409` VERSION_CONFLICT / BUCKET_LOCKED, `503` PERSISTENCE_UNAVAILABLE — mapped in `mapHttpError`.

`PROXY_ROUTE_NOT_ALLOWED` only → `blocked_contract`.

## P3 / K2 notify

- List load: K2 @ `72193c78` returns `{ items, page, limit, total, hasMore }` — P3 must paginate; do not assume `{appeals, partners}` only.
- Embed viewer overlay: `personalMeta` / `personalOverlays` from list or separate load after K2 ids stable.
- Pass `expectedVersion` / `expectedVersions` from overlay `version` field after refetch.

## Removed (invalid)

`client-appeals/.../personal-overlay` — **never shipped**; removed from П5 @ tip after this doc.
