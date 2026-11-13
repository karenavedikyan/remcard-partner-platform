# П1 — cross-repo wire check (2026-11-13 20:49 MSK)

## K5 actual (`86ac3e354dc543817c061cb43565d0bf77545ab0`)

| Method | Path | Response shape |
|--------|------|----------------|
| PATCH | `/api/pro/referred-appeals/[id]/personal-meta` | `{ meta: ... }` |
| POST | `/api/pro/referred-appeals/personal-batch` | `{ action, mode, processedCount, skippedCount, processed, skipped }` |

**PATCH body:** `expectedVersion?`, `alias?`, `tag?`, `note?`, `action?`, `target?` (move/restore).

**POST body:** `action: move|restore|setTag`, `ids`, `target?`, `tag?`, `mode: atomic|best_effort`, `expectedVersions?`.

## Partner proxy (P1 owned)

Whitelisted **only** the two K5 paths above in `src/lib/remcard-proxy.ts`.

**Rejected — never whitelist:**

- `PATCH /api/pro/client-appeals/:id/personal-overlay` (P5 `518f6dd8` invention)
- `POST /api/pro/client-appeals/personal-overlay/batch`

HTTP 401/403/404 from navigator are **real** route outcomes, not generic `BLOCKED_CONTRACT`.

## K2 list (`72193c78` GET `/api/pro/referred-appeals`)

**Actual JSON:**

```json
{ "items", "page", "limit", "total", "hasMore", "empty" }
```

Branch metadata loaded server-side (`ObserverReceivingBranchMeta`); not a flat `{ partners[] }` dump in list response.

## P3 fetch mismatch (owner **P3**, not P1)

Legacy UI adapter expects `{ appeals, partners, personalMeta|personalOverlays }`. **Must** map from K2 `items` + pagination + separate partner/overlay fetches — no fake empty defaults.

## K2 GET proxy

**Not** whitelisted in this tranche (K5-only per Root wire check). **P1** adds GET allowlist only after Root accepts K2 tip + DTO adapter in P2/P3.

## Section publish

`clientsSectionPublishable: false` — DB migrate/deploy separate user confirmation.
