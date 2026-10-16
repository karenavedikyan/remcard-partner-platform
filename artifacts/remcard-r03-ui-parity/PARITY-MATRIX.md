# R03 UI parity matrix — small delta (2026-10-16)

Legend: **CLOSED** · **OPEN** · **NOT_VERIFIED** · **PARTIAL**

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Mobile toolbar @375: search full width; show + list/cards one row; filters below | **CLOSED** | `.collectionToolsSecondRow` + final responsive block; `toolbarRowOk` assert |
| 2 | Client purchase pill compact in cards; mobile list status line then name | **CLOSED** | `justify-self:start` / `max-content`; `mobileRecordStatusRow` |
| 3 | Evidence: matched pair, viewport bottomnav, per-capture SHA, cards @320 | **CLOSED** | `*-matched` crops, `*-viewport-*` PNGs, `cards320` matrix rows, `carryOverFrom` on carry-over |

## Still honest exceptions

- Full dataset ref ≠ seed — **NOT_VERIFIED** globally; single pair **PARTIAL** via `PARITY_MATCH` + search (`captures.json` `dataParity`).
- Stat money **—**; client **«бонус —»**; page-only selection; impl test banner.
- Region diffs on non-matched rows — operator visual review only.

Merge base: **PR #17** @ `375d2636613b4d2f0a3bec89a691ad7eb8c05ad7`.
