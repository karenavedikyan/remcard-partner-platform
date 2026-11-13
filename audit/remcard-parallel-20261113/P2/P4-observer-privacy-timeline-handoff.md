# P4 observer privacy — prototype-proven rules (P2 inventory)

| Field | Value |
|-------|-------|
| Prototype | `3dc31836` — `client-appeals.js`, `observer-personal-list.js` |
| P2 constants | `CLIENTS_OBSERVER_REFERRER_LIST_SCOPE`, `CLIENTS_OBSERVER_PUBLIC_TIMELINE`, `CLIENTS_OBSERVER_DETAIL_HTTP_CONTRACT` |
| P4 owns | Observer detail UI only — **read** `ObserverPublicTimelineEvent[]` |

## List scope (not receiver lifecycle)

**`ownReferredAppeals()` ~2217** includes a row when:

1. `referrerPartnerId === REFERRER_VIEWER.id`
2. Certificate flow (`hasCertificateFlow`)
3. Receiving partner known in `PARTNERS`

**Does not** filter on receiver `archivedAt` / `deletedAt` / incoming bucket.

**Incoming** lifecycle uses `appealInBucket` + `workspaceLifecycle` (~975–1034) — **receiving only**.

**Observer personal** bucket: `observerPersonalBucket` from `observer-personal-list.js` — independent overlay (K5 persistence).

## Public timeline (not new policy)

Heading in prototype: **«Хронология (без внутренних заметок партнёра)»**.

Pipeline:

1. `isPublicReferrerHistoryEntry(entry, appeal)` ~2299 — regex filters internal/archive/trash/manual/group noise
2. `publicHistoryLine(entry, appeal)` ~2316 — normalize visible line
3. `publicReferrerTimeline(appeal)` ~2333 → `{ at, text }[]`

**P4 must render only** `ObserverPublicTimelineEvent` (`at`, `text`). No `author`, `reason`, raw history `text`.

## K2 detail wire (target)

`GET /api/pro/referred-appeals/:appealId` → `ObserverReferredAppealDetailHttp`:

| Field | Content |
|--------|---------|
| `appeal` | Observer allowlist DTO (no `privateNotes` / `clientContact`) |
| `receivingPartner` | Principal meta wire |
| `timeline` | **Filtered** public events only |
| `purchase?` | Referrer purchase read projection (not bonus payout) |

## Forbidden (P4 / K2 / partner)

| Wrong | Right |
|--------|--------|
| K1 `history[]` with `authorLabel` on observer screen | K2 `timeline[]` public only |
| Hide referrer row when `PartnerClientAppeal.deletedAt` set | Row visible; receiver trash ≠ observer removal |
| Map receiver trash to observer personal bucket | K5 overlay bucket only |

## Gaps @ K2 `78ce748d` (Root-assigned)

- **GAP-K2-OBSERVER-DELETED-AT** — `deletedAt: null` in list/detail `where`
- **GAP-K2-OBSERVER-TIMELINE-RAW** — unfiltered `text` on detail
- **GAP-K8-PUBLIC-TIMELINE** — shared K8 helper; K2 imports

## Section READY

**false** — timeline filter + deletedAt scope + proxy + prod DB.
