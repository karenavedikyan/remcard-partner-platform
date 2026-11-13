# V5 — measured KPI `.stats` cascade (prototype `3dc31836`)

## Pins

| Role | SHA |
|---|---|
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| Prior Computer mount (FAIL cols) | `d1da948491293c1a8ba77d4854191347708b4379` |
| **Correcting commit** | `5c7db88744825e33cc68bc5210b11185f1aa5c8d` |
| **Audited tip** | `e4ddc09813b5d06909a166a4d1190f79bf6918fb` |
| Production packaging base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |

Do **not** treat `ffd4aa61` / V3–V4 old screenshots as verification of this tip.

## Prototype source (frozen `client-appeals.css`)

- Default / through tablet (`max-width:760px`): **4** KPI columns on personal-partner cards
- `max-width:360px`: **2** KPI columns

## Candidate FAIL on `d1da9484` (Computer + V4)

| Width | Observed cols | Expected |
|---|---|---|
| 768 | **2** | 4 |
| 375 | 4 | 4 |
| 360 | **4** | 2 |
| 320 | **4** | 2 |

Cause: `@media (max-width:768px){ .stats{repeat(2)} }` plus late `@media (max-width:375px){ .stats{repeat(4)} }` overriding ≤360.

## Fix on `5c7db887` (narrow CSS only)

- Scope rules to `.partnerCard .stats`
- Keep **4** cols through 760/375; **2** only at `max-width:360`
- Drop erroneous 768→2 and late 375→4 overrides
- No redesign / no general style rewrite
- Playwright `getComputedStyle` assertions added (`observer-stats-grid.computed.test.ts` + measure script)

## Independent auditor re-measure (`e4ddc098`)

1. Harness measure → `v5-computed/stats-grid-computed.json` (`allPass=true`, `candidateSha=e4ddc098…`)
2. Isolated `ObserverPartnersListView` mount → `v5-isolated-mount-e4ddc098/`  
   KPI cols light+dark: **1440/1024/768/375 → 4; 360/320 → 2** (`kpiCascade.allMatch=true`)
3. Vitest with system Chrome: `observer-stats-grid.computed.test.ts` **13/13 PASS** (+ partner list/detail component tests PASS)

`clientWidth`+PNG match requested widths; mobile `innerWidth` still +14 (documented; CSS uses layout width).

## Not claimed

- Full pixel visual parity PASS (card height/spacing etalon not re-declared PASS)
- Section acceptance (Gate/Context/route/helper/vitest still ≠ `57ca4680`)
- Persistence / CRM mapping PASS (save remains disabled; contracts blocked)
