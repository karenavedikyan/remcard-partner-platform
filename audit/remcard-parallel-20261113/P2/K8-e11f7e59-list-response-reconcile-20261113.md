# K8 @ e11f7e59 + K2 @ 72193c78 — list response reconcile (P2)

**Canonical K8 tip:** `e11f7e59e6759bf3f67eb1829f7cff0e006de73e` (`cursor/remcard-k8-acceptance-20261113`)  
**K2 HTTP draft:** `72193c7853df8291a5b7956059d574b834cdbce7` (legacy `GET /api/pro/referred-appeals`)

## Resolved @ e11f7e59 (gaps A–D)

| Gap | Evidence |
|-----|----------|
| A P2002/aborted tx | `resolveCertificateCreateRace` + catch outside `createCertificateAppealTransactional` |
| B observer principal | `canObserverListIncludeAppeal`: `viewerUserId === observerPrincipalUserId === referrerProUserId` |
| C access context | `TrustedAppealAccessContext` required on `resolveAppealAccess` |
| D observer DTO | `ClientAppealObserverReadDto` + `toObserverAppealDto` allowlist |

## Single list envelope (no phantom contracts)

| Layer | Owner | Canonical JSON keys |
|-------|-------|---------------------|
| K8 lib receiving | K1 | `{ items, nextCursor }` — `K1_RECEIVING_API.md`, `receivingList.ts` |
| K8 lib observer | K2/K8 | `{ items, nextCursor }` — `observerList.ts`, `APPEAL_RECORD_LIST_INCLUDE` + `recordMap.ts` |
| K2 HTTP (target) | K2 | `{ items, receivingBranches, personalMeta?, page?, limit?, total?, hasMore?, nextCursor? }` on `GET /api/pro/client-appeals/observer` |
| Partner UI (P3) | P5 | `{ appeals, partners, personalMeta?, nextCursor? }` — `ObserverAppealsLoadResult` ok branch |

**Forbidden on navigator lib/receiving HTTP:** top-level `appeals` (alias only in P5 after fetch).

**P5 mapping (stable):**

- `items` → `appeals` via `OBSERVER_APPEAL_ADAPTER_MAP`
- `receivingBranches` → `partners` (`branchId` → `id`, `displayName` → `name`)
- `personalMeta` passthrough

## K2 actual @ 72193c78 vs target

**Today:** `GET /api/pro/referred-appeals` returns:

```json
{ "items", "page", "limit", "total", "hasMore", "empty" }
```

**Missing for P3:** `receivingBranches`, `personalMeta`, full allowlist DTO (`ClientAppealObserverReadDto` / `toObserverAppealDto`).

**GAP-K8-F:** `OBSERVER_APPEAL_ROW_SELECT` and stats `where: { paidAmountKopecks }` treat paid amount as a column. K8 computes it only in `mapPartnerClientAppealToRecord` from `order.totalAmount`. K2 must stop selecting/filtering on a non-column field.

**GAP-K8-G:** K5 `PartnerClientAppealPersonalOverlay` must join into list response (or dedicated batch read) for `personalMeta`.

**GAP-K8-H:** Two route families — interim `referred-appeals` vs inventory `client-appeals/observer`; converge on k2ObserverApi.

## Pagination note

- K8 **library** uses **cursor** (`take + 1`, `nextCursor`).
- K2 **HTTP draft** uses **page/limit**. Target contract allows either keys on HTTP until K2 aligns route with lib; P5 may pass `nextCursor` when HTTP switches.

## Section acceptance

Still **BLOCKED**: partner canonical routes `NOT_IMPLEMENTED`, proxy unwired, prod DB migration not approved. This document is contract handoff only.
