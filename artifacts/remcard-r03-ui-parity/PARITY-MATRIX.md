# R03 UI parity matrix — corrective pass (2026-10-16)

Legend: **CLOSED** (fix + capture) · **VISUAL_DIFF** (operator review) · **OPEN** · **NOT_VERIFIED**

Evidence: `screenshots/captures.json` (corrective re-capture + carry-over desktop pairs), runner `ok: true` with geometry asserts.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Mobile cards 1 column @375/320 | **CLOSED** | CSS cascade fixed; `cardsColumnOk` assert (1 track mobile, 2 @1440) |
| 2 | Mobile stats row + hero CTA + toolbar layout | **CLOSED** | 3-col compact stats; full-width CTA; search+show+view / filters row |
| 3 | Desktop client status vs actions overlap | **CLOSED** | `collectionTable` 280px actions col; overlap assert |
| 4 | Client card + mobile list borders | **CLOSED** | status→name→detail→task; actions right; bordered mobile rows |
| 5 | Capture methodology | **CLOSED** | scroll top, `agent-r03-capture-body`, cert **shell** crop, smoke after capture |

## Visual review (NOT 1:1 PASS)

- Region diffs remain on cert-card / client-row / toolbar — operator must review PNGs.
- Reference demo dataset ≠ parity seed (4 clients / 3 certs) — **NOT_VERIFIED** data parity; layout crops only.

## Functional exceptions (unchanged)

- Stat money **—**; client detail **«бонус —»**; no select-all-across-pages; impl test banner.

Merge base: **PR #17** @ `375d2636613b4d2f0a3bec89a691ad7eb8c05ad7`.
