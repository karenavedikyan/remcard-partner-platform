# П7 — Адаптивность и стили Клиентов

**Agent:** П7  
**Base (candidate):** `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0`  
**Branch:** `cursor/remcard-p7-acceptance-20261113`  
**Prototype pin:** `3dc31836cd18d9209c20097f18b906dd276f7af6` (`design/general-prototype/partner/client-appeals.css`)  
**Own product file:** `src/components/clients/observer/observer.module.css`

## Changed files (П7)

| File | Change |
|------|--------|
| `src/components/clients/observer/observer.module.css` | Prototype parity: compactTop 340px min stats track, cellLabel desktop hidden, expandedClients 16px, personalRows gap 0, chevron offset, grouped ghostBtn, clientColumns margin, @760 disclosure/toolbar/group-head |
| `src/components/clients/observer/P7.observer-prototype-layout.test.ts` | New: 5 source-token + 12 viewport computed (light/dark × widths) |
| `audit/remcard-parallel-20261113/P7/vitest.p7.config.ts` | Local runner (main `vitest.config.ts` read-only) |
| `audit/remcard-parallel-20261113/P7/test-run.log` | P7 vitest log |

## CSS fixes (evidence → prototype)

| Rule | Before | After (prototype) |
|------|--------|-------------------|
| `.compactTop` | `minmax(0,1fr)` stats | `minmax(340px,1fr)` |
| `.cellLabel` | always visible | `display:none` desktop; `block` ≤1100px grouped |
| `.expandedClients` | gap 12 / pad 8 | gap 16 / pad 16 |
| `.personalRows` | gap 8 | gap 0 |
| `.chevron` | no Y offset | `translateY(-2px)` (+ open rotate) |
| `.personalRowGrouped > .ghostBtn` | generic ghostBtn | 12px / 10×12 pad / wrap |
| `.clientColumns` | — | `margin-bottom: -16px` |
| `@760px` | partial | disclosure wrap, meta width, toggle `margin-left:auto`, group-head, toolbar stack |

**Preserved (V7):** no `grid-template-areas` on grouped rows; breakpoints 1100 / 760 / 360; KPI 4 cols >360px, 2 at ≤360px.

## Tests run

```bash
npx vitest run --config audit/remcard-parallel-20261113/P7/vitest.p7.config.ts
npx vitest run src/lib/clients-parity/observer-visual-tokens.test.ts \
  src/lib/clients-parity/observer-stats-grid.computed.test.ts \
  src/lib/clients-parity/observer-mobile-navigation.computed.test.ts \
  src/components/clients/observer/ObserverPartnersListView.test.tsx
```

| Suite | Result | Notes |
|-------|--------|-------|
| `P7.observer-prototype-layout.test.ts` | **PASS** (17) | Via P7 vitest config |
| `observer-visual-tokens.test.ts` | **PASS** (5) | Shared lib; V7 tokens |
| `observer-stats-grid.computed.test.ts` | **PASS** (13) | 320–1440 light/dark KPI columns |
| `observer-mobile-navigation.computed.test.ts` | **PASS** (11) | Harness 5377; status/date Δtop≤1px |
| `ObserverPartnersListView.test.tsx` | **PASS** (7) | Fixture presentation |
| Full-browser 320–1440 resize screenshots | **BLOCKED** | No approved mocked full-app egress in this run |
| `vitest.config.ts` include for `P7.*` | **BLOCKED** | Config read-only — cross-owner |

## Requirement ledger (П7 scope)

| ID | Requirement | Status |
|----|-------------|--------|
| R-P7-CSS-OWN | Sole writer `observer.module.css` | **PASS** |
| R-P7-V7-REG | V7 grid/KPI/row regressions | **PASS** (24 shared tests) |
| R-P7-PROT-TOK | Prototype tokens compactTop/cellLabel/expanded/760 | **PASS** (P7 17) |
| R-P7-VIEWPORTS | 320/360/375/768/1024/1440 both themes live | **PARTIAL** — computed + harness; not full screenshot matrix |
| R-P7-LONG-DATA | Long names/notes overflow | **NOT RUN** (needs JSX fixtures; read-only owners) |
| R-P7-SECTION | Whole Clients observer acceptance | **BLOCKED** (BLK-REFERRED, BLK-PERSIST) |

## Computed geometry (P7 harness, sample)

| Viewport | Theme | cellLabel `display` | compactTop 2nd track (px) | expandedClients gap |
|----------|-------|---------------------|---------------------------|---------------------|
| 1440 | light/dark | `none` | ≥340 | `16px` |
| 1024 | light/dark | `block` | ≥465 (resolved fr) | — |
| 768–320 | light/dark | `block` | — (stacked @760) | — |

Mobile harness (shared V7): grouped status/updated same row @320–1024; open button height ≥44px, width ≥48px.

## Cross-owner dependencies

| Need | Owner |
|------|-------|
| Add `P7.*.test.ts` to root `vitest.config.ts` include | Shared CI / К-gate |
| Full-page resize screenshots | QA fixtures + mocked app shell |
| `personalRow` border-top vs border-bottom (prototype) | П7 optional follow-up — not changed (risk to row metrics) |
| Referred appeals + personal persistence APIs | Backend / К-contract |

## Remaining work (П7)

1. Screenshot diff matrix 320–1440 light/dark (blocked on harness publication).  
2. Long-data overflow spot-check on real JSX trees (read-only components).  
3. Trash-bucket grid column tweak (prototype drops 150px edit col) — verify with К bucket JSX.  
4. Register P7 tests in root vitest include when config owner allows.

## Git

**Tip:** see `COMMIT.txt` (latest push).

## Review follow-up (accent / production globals)

**Finding:** Dark theme with production `globals.css` (no `--accent`) left `var(--accent,#c12b2f)` on `--surface #202520` at contrast ~2.71 for 16px bucket/layout pressed state.

**Fix (observer.module.css only):** `--observer-accent` on `.section`, `.blocked`, `.partnerCard`, `.personalTools`; eight call sites use `var(--observer-accent)` (prototype `--accent` when present, else `--accent-emphasis` / `--primary`).

**Tests:** `P7.observer-accent-contrast.test.ts` injects real `src/app/globals.css` + module CSS; dark pressed controls resolve `rgb(253,164,175)` and pass WCAG AA 4.5:1 on `--surface`. P7 total **22** tests PASS via `vitest.p7.config.ts`; shared regression **36** PASS.
