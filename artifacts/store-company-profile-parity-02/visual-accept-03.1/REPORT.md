# VISUAL-ACCEPT-03.1 — control pass

## Status

**control-pass** — 3 ref+impl pairs @ 1440×900 light, viewport PNG (scrollY=0, DPR=1).

## Capture path fixes (temporary script `/tmp/visual-accept-03.1-control.mjs`)

| Issue (turn97) | Fix |
|----------------|-----|
| Ref `nav-profile` strict mode (3 buttons) | `getByTestId('nav-profile').first()` (+ `view-cabinet`.first()) |
| Impl basics via disabled aside steps | «Редактировать профиль» → «Продолжить →» → `Шаг 2 из 4` |
| Catalog loaded gate on `getByText('Магазин Юг')` | Dev-fixture heading + `catalog-public-name` input value on step0 only |
| Ref summary vs impl summary mismatch | `ensureRefStoreProfileSummary()` through prototype `pw-next` / `pw-skip` to `[data-testid="pw-summary"]` |

## Covered (this drop)

| Frame id | Impl loaded marker | Notes |
|----------|-------------------|--------|
| `store-basics-summary` | Dev-fixture + `business-profile-completed-summary` | Ref: prototype `pw-summary` «Заполнено» |
| `store-basics-step1` | Wizard progress «Шаг 2 из 4» after one submit | Ref: edit → one `pw-next` |
| `store-catalog-step0` | `organization-catalog-wizard` + `[data-catalog-step="0"]` | Ref: profile tab catalog |

## Observable ref vs impl (expected parity deltas, not blockers)

- Impl uses **dev-fixture** banner and fixture org «Магазин Юг» / 3 branches; ref uses prototype demo persona «Алексей Магазин» / «Мой магазин» sidebar label.
- Summary layout: impl `business-profile-completed-summary` card vs ref `.pw-summary` — same information architecture, different component chrome.
- Catalog step0: both show public-name step; field testid alignment is impl-side `#oc-public-name` / `catalog-public-name`.

## Still open (prior `visual-accept-03` matrix)

Not re-run in 03.1 (avoid 88× repeated failures):

- COMPANY role pairs (basics/catalog branches)
- Mobile / dark breakpoints
- Catalog steps 1–preview, pending, no-org fixture states
- Scroll-state lower viewport crops where sticky chrome overlaps form
- Turn97 **25 impl-only** PNGs under `visual-accept-03/` — reuse after extending this script with same gates

## Pins

- `captureCheckoutHead`: see `manifest.json` (git HEAD at capture time, not post-commit artifact tip)
- `implRenderSourceSha`: `969f6545326118751e7217bddb18d55faa6d9bf3`
- `branchBSha`: `cadb77e5d1834a6c45f778e49e9f23469eb62b46` (frozen)
- Prototype: commit `9bc52fb9152293e992e98dc50804a660cef10733`, tar SHA256 `382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d`

## Log

Last run: `/tmp/visual-accept-03.1-run3.log` — 3× OK, no ref attempt-2 blockers.
