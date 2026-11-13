# Root fixed assembly pins (2026-11-13)

Source-only coordination. **No DB/deploy.** `clientsSectionPublishable: false`.

## Navigator backend (verified for proxy wire)

| Owner | SHA | Proxy |
|-------|-----|--------|
| K8 contract/schema | `1894569a` | (no direct partner proxy) |
| K1 receiving | `63a4f3d6` | `client-appeals/*` — detail **`GET` + `PATCH`** on `[id]/route.ts` |
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
| P6 | `4dca7af7` (mappers/cursor; prior pin `06f7e6bb` superseded for detail wire) |

## P1 proxy review @ `6eda0029`

- **OK:** `.../stage` PATCH, `working-stages` GET/POST/PATCH/DELETE match K1 `83f279e8` exports.
- **Wired @ K1 `63a4f3d6`:** `PATCH /api/pro/client-appeals/:id` on same regex as GET (profile fields; stage still `.../stage`).
- **P6 `4dca7af7` / P4:** see `P4-P6-RECEIVING-DETAIL-PATCH-HANDOFF.md`.

## Rejected proxy (unchanged)

- P5 `client-appeals/.../personal-overlay*`
- `PATCH /api/pro/referred-appeals/:id` (K2 GET-only detail)
