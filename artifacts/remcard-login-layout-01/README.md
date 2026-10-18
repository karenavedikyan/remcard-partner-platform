# LOGIN-LAYOUT-01 evidence

**Base branch:** `release/prof-v1-20261007` @ `0fe7da52bb02f2a515d238757c8be16ef2d83948`

## Fix (scoped)

Partner MAX/Telegram login used `AuthFlow` `layout="full"` inside `.shell` (`max-width: 28rem`), squeezing the two-column `entryLayout`. Partner mode now renders mode tabs in `.loginModeBar` (80rem) and full-width `AuthFlow`; admin tab keeps compact `.shell`.

## Verification notes

- **Production** `/login` baseline PNGs: `before-prod-*` (observed broken grid ~140px/128px columns inside 448px shell).
- **Local** post-fix on dev server: `after-local-*` (mock/session not exercised end-to-end).
- **Logout → re-login loop:** `NOT_VERIFIED` in this run (no isolated fixture contour with real logout semantics).
- **Not claimed:** production deploy, pixel-perfect PASS, or full auth chain.

See `manifest.json` for measured widths, overflow flags, and screenshot index.

## LOGIN-LAYOUT-01.1 addendum

- **True 375px:** `after-local-mobile-375-w375-{light,dark}.png` with pre-capture assert `innerWidth===375`, `deviceScaleFactor=1`.
- **Superseded iPhone-13 (390px):** `*-old390-*.png` — historical only, do not overwrite metadata.
- **Login→logout→re-login:** `NOT_VERIFIED` in this run (see `test-run-01.1.json`); harness `run-01.1-evidence.mjs` for retry when admin-test stack is healthy.
