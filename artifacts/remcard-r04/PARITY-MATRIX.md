# R04 parity matrix (R04.4)

Reference: `roles.js` SHA256 `0c9a8be699670e94345e4d0e1a3a331f4402966ca26c4b74c1ab98e0daf7e5bc`.

| ID | Surface | Impl | Ref | Notes |
|----|---------|------|-----|-------|
| P1–P8 | list/cards/find/inv/mobile/dark | `screenshots/impl-r04-*` | `screenshots/ref-r04-*` | CAPTURED |
| P9 | 320 smoke | `impl-r04-P9-320-light.png` | — | viewport smoke |
| extras | invites in/out, modal 320 | `impl-r04-inv-*`, `impl-r04-modal-320-light.png` | — | populated states |

## Geometry (`PARITY-VISUAL.json`)

- Uses `agent-r04-partners-table` (not R03 `collectionTable`).
- `firstRow.h` must be ≤ 120px for list rows (guards letter-stacking bug).
- P4 invitations: no active/archive toolbar in impl when on invitation segment.
- Modal captures: viewport-only (not fullPage) for P3/P6/modal-320.

## R04.4 recapture

| IDs | Reason |
|-----|--------|
| P1,P2,P7,P8 | Direct action toolbar on list/cards |
| P3,P6,modal-320 | Find modal filter order + meta lines |
| P5,P9 | Mobile list + hub CTA color |

P4 / invitation extras: carry-over from R04.3 accepted captures (`a03ca3c` era) unless re-run manually.

## Visual review

`visualParityOk: false` — automated pairs/row-height only. Exceptions: test banner, micro copy/spacing vs ref. Remaining deltas for human review: card micro-spacing vs ref, modal width vs ref on very wide screens.
