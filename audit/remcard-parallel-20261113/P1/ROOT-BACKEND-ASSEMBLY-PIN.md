# Root fixed assembly pins (2026-11-13)

Source-only coordination. **No DB/deploy.** `clientsSectionPublishable: false`.

## Navigator backend (verified for proxy wire)

| Owner | SHA | Proxy |
|-------|-----|--------|
| K8 contract/schema | `1894569a` | (no direct partner proxy) |
| K1 receiving | `83f279e8` | `client-appeals/*` — **detail `GET` only** on `[id]/route.ts` |
| K2 observer GET | `78ce748d` | `referred-appeals/*` GET |
| K5 personal | `6c444487` | unchanged vs prior wire |

## Partner UI candidates (Root fetched — do not merge whole branches)

| Owner | SHA |
|-------|-----|
| P1 | `6eda0029` (proxy @ tip; manifest bumps with P1 commits) |
| P2 | `9f7c3755` |
| P3 | `b85efb54` |
| P4 | `1850d088` |
| P5 | `6a72f353` |
| P6 | `06f7e6bb` |

## P1 proxy review @ `6eda0029`

- **OK:** `.../stage` PATCH, `working-stages` GET/POST/PATCH/DELETE match K1 `83f279e8` exports.
- **Intentionally absent:** `PATCH /api/pro/client-appeals/:id` — not in K1 source; P6 editor awaits K1 PATCH + adapter (**P6/P2**, not P1).
- **When K1 ships detail PATCH:** P1 adds **only** `PATCH` to the existing reserved-segment `client-appeals/:id` regex; update `PROXY-CLIENTS-ROUTE-MANIFEST.md` + manifest.

## Rejected proxy (unchanged)

- P5 `client-appeals/.../personal-overlay*`
- `PATCH /api/pro/referred-appeals/:id` (K2 GET-only detail)
