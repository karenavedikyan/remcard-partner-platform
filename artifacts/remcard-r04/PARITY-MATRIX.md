# R04 parity matrix (R04.2)

Reference: `roles.js` SHA256 `0c9a8be699670e94345e4d0e1a3a331f4402966ca26c4b74c1ab98e0daf7e5bc` (frozen prototype).

| ID | Surface | Viewport | Theme | Impl | Ref | Status |
|----|---------|----------|-------|------|-----|--------|
| P1 | Active list (table) | 1440 | light | `screenshots/impl-r04-P1-1440-light.png` | `screenshots/ref-r04-P1-1440-light.png` | CAPTURED |
| P2 | Active cards (grid) | 1440 | light | `screenshots/impl-r04-P2-1440-light.png` | `screenshots/ref-r04-P2-1440-light.png` | CAPTURED |
| P3 | Find / invite modal | 1440 | light | `screenshots/impl-r04-P3-1440-light.png` | `screenshots/ref-r04-P3-1440-light.png` | CAPTURED |
| P4 | Invitations (incoming tab) | 1440 | light | `screenshots/impl-r04-P4-1440-light.png` | `screenshots/ref-r04-P4-1440-light.png` | CAPTURED |
| P5 | Active list mobile | 375 | light | `screenshots/impl-r04-P5-375-light.png` | `screenshots/ref-r04-P5-375-light.png` | CAPTURED |
| P6 | Find modal mobile | 375 | light | `screenshots/impl-r04-P6-375-light.png` | `screenshots/ref-r04-P6-375-light.png` | CAPTURED |
| P7 | List dark | 1440 | dark | `screenshots/impl-r04-P7-1440-dark.png` | `screenshots/ref-r04-P7-1440-dark.png` | CAPTURED |
| P8 | Cards dark | 1440 | dark | `screenshots/impl-r04-P8-1440-dark.png` | `screenshots/ref-r04-P8-1440-dark.png` | CAPTURED |
| P9 | 320 smoke | 320 | light | `screenshots/impl-r04-P9-320-light.png` | — | CAPTURED (smoke) |

Extra state captures (impl only): `impl-r04-inv-incoming-1440-light.png`, `impl-r04-inv-outgoing-1440-light.png`, `impl-r04-modal-320-light.png`.

## Geometry (`PARITY-VISUAL.json`)

- P1 @ 1440: desktop `listTable` bounds populated; P2: `cardGrid` populated, `listTable` null (distinct modes).
- P9 @ 320: `listTable` w/h 0 (mobile rows); `toolbarClipped: false`.
- Test-session banner may add top offset vs ref; not masked in captures.

## Visual review

- `PARITY-VISUAL.json` → `visualParityOk: false` — pairs/geometry automated only, not composition PASS.
- Known remaining deltas vs ref (operator review): shell test banner; filter panel vertical density on 375/320; modal drawer width vs ref on narrow viewports; invitation empty-state copy spacing.
