# Partner proxy — Clients appeals routes (source-verified)

**Wire status:** `src/lib/remcard-proxy.ts` allowlist matches navigator route exports below.  
**Not publishable:** DB not applied; `clientsSectionPublishable: false`. Profile `89fb8e07` published ≠ section ready.

## Navigator candidate SHAs

| Owner | SHA | Scope |
|-------|-----|--------|
| K8 core/contract | `6f09c23e` | `receivingPartnerUserId` required; org/branch optional |
| K1 receiving | `f722a164` | `client-appeals/*` |
| K2 observer read | `3c6ccc19` | `referred-appeals/*` GET |
| K5 observer personal | `6c444487` | personal-meta PATCH, personal-batch POST |

## Added to `ALLOWED_ROUTES` (exact)

### K1 @ f722a164

| Method(s) | Pattern |
|-----------|---------|
| GET, POST | `/api/pro/client-appeals` |
| GET | `/api/pro/client-appeals/:id` |
| PATCH | `/api/pro/client-appeals/:id/stage` |
| POST | `/api/pro/client-appeals/batch` |
| GET, POST, PATCH, DELETE | `/api/pro/client-appeals/working-stages` |
| POST | `/api/pro/client-appeals/certificate-entry` (501 until scan hook) |

### K2 @ 3c6ccc19

| Method(s) | Pattern |
|-----------|---------|
| GET | `/api/pro/referred-appeals` |
| GET | `/api/pro/referred-appeals/:id` |
| GET | `/api/pro/referred-appeals/by-partner/:partnerId` |

List JSON: `{ appeals, partners, personalMeta, page, limit, total, hasMore, empty }`.

### K5 @ 6c444487

| Method(s) | Pattern |
|-----------|---------|
| PATCH | `/api/pro/referred-appeals/:id/personal-meta` → `{ meta }` |
| POST | `/api/pro/referred-appeals/personal-batch` → `{ action, mode, processedCount, skippedCount, processed, skipped }` |

## Rejected (no allowlist entry)

| Method | Path | Reason |
|--------|------|--------|
| PATCH | `/api/pro/client-appeals/:id` | **Not exported** @ f722a164 (detail GET only) |
| POST | `/api/pro/client-appeals/:id/stage` | Source exports **PATCH** on `.../stage`, not POST |
| PATCH, POST | `/api/pro/client-appeals/.../personal-overlay*` | P5 invention; use K5 `referred-appeals` paths |
| PATCH, DELETE, … | `/api/pro/referred-appeals/:id` | K2 detail is **GET-only** |
| * | `/api/pro/agent-clients*` as referred substitute | Different CRM; keep existing agent-clients allowlist only |
| * | Wildcard `/api/pro/*` | Forbidden |

## Interface notes (not P1 product)

- K2 `by-partner` @ 3c6ccc19 still documents `partnerId` as `receivingBranchId` — **P2/K2** align with K8 `6f09c23e` User.id principal.
- Financial read projection: K8 owns; bonus payout ≠ client purchase total/date.

## Regex guardrails

`:id` patterns exclude fixed siblings (`batch`, `working-stages`, `certificate-entry`, `personal-batch`, `by-partner`) so static routes are not absorbed as ids.

## Scoped test

`tsx --test src/lib/remcard-proxy.test.ts` — **31/31** allowlist assertions in transport suite.
