# R03 UI parity RC

## Git (small delta close-out)

| Repo | Branch | HEAD (full) | Base |
|------|--------|-------------|------|
| remcard-partner-platform | `cursor/r03-ui-parity-b3e3` | `386d2f51b4896e38f893cafc6cb0c026167b71d9` | `#17` @ `375d2636613b4d2f0a3bec89a691ad7eb8c05ad7` |
| remcard-navigator | `cursor/r03-ui-parity-b3e3` | `651150754af947a3ff896fe9431c68bd45ac5266` | `40b8094e4bf2158fd7a10b1cc1c33474b90a77b3` |

Corrective baseline (accepted, not reworked): runtime `911362a5c876fb62a25add4f6e97e7e546fb87cc`, captures `2026-10-16T04:58:46Z`.

## Delta items 1–3 (2026-10-16)

| # | Item | Status |
|---|------|--------|
| 1 | Mobile toolbar @375 (search full width; show + list/cards one row; filters below) | **CLOSED** — final CSS block + `toolbarRowOk` |
| 2 | Purchase pill compact in client cards; mobile list status then name block | **CLOSED** — prior TSX + CSS retained |
| 3 | Evidence (matched pair, viewport bottomnav, per-capture SHA, cards @320) | **CLOSED** — see `captures.json` |

### Evidence commands

```bash
npm run build
npx vitest run src/lib/agent-r03/clientListRow.test.ts
R03_DELTA_CAPTURE=1 node scripts/r03-ui-parity-visual.mjs
```

- **Matched pair (PARTIAL data parity):** `PARITY_MATCH` seed + ref search — `*-375x812-matched` cert card / client row crops.
- **Viewport (not full-page nav artifact):** `*-viewport-top` / `*-viewport-toolbar` @375 and @320; asserts `bottomNavPinned` + search reachable after scroll.
- **320 cards:** `*-320x812-cards320` with `cardsColumnOk`.
- **Carry-over desktop / 1440:** entries keep `carryOverFrom.platformSha` / `capturedAt` from prior run (not relabeled to delta SHA).

## Honest exceptions (unchanged)

- Global ref demo dataset ≠ full seed — **NOT_VERIFIED**; single pair **PARTIAL** only.
- Stat money **—**; client list **«бонус —»**; page-only selection; impl test banner.

## Reference SHA256 (verified)

- roles.html `d6c00f57928f6dc885e9dd714937d8ae897dfaedb8e5e806e46f0ea741a09859`
- roles.js `0c9a8be699670e94345e4d0e1a3a331f4402966ca26c4b74c1ab98e0daf7e5bc`
- roles.css `563ec02db1ca75f3377e3265cf84f15ac2ba5f62c7b0d269d4b2b5f872b8a3b6`
