# REM-PUBLISH-RESIDUAL-20261113-V2 — П7 observer CSS

**Owner:** П7 (`observer.module.css` only)  
**Product tip:** `c5c7f2091187565d5cf883a5ec18d3a2b4009d24` (unchanged this pass)  
**Audit tip:** `30a292d0` + this commit (measure v2 only)  
**Prototype:** `3dc31836cd18d9209c20097f18b906dd276f7af6`

## What was verified (new this pass)

| Command | Result |
|---------|--------|
| `node audit/remcard-parallel-20261113/P7/measure-paired-residual-v2.mjs` | **28 samples**, `paired-residual-v2.json`, screenshots `screenshots-residual-v2/` |
| `npx vitest run --config audit/.../vitest.p7.config.ts P7.observer-paired-residual.test.ts` | After script (see log) |

**Harness:** Google Fonts Manrope (frozen `partner/index.html` chain), production `globals.css`, minimal `.content` shell, partial fixture — **not** full Next/cabinet nav.

**Viewports:** 320/375/768/1024/1440 × light/dark @900h; **short-375×568**, **short-1440×650**.

## Criterion evidence

| Criterion | Partial harness | Full shell |
|-----------|-----------------|------------|
| Bucket 12px / 4×12 / h≥44 | **PASS** all widths/themes | **OPEN** |
| Summary 14px / min-height 44 | **PASS** | **OPEN** |
| Toggle label 12px | **PASS** | **OPEN** |
| KPI dd 20px | **PASS** | **OPEN** |
| Grouped row grid vs proto | **PASS** (delta empty) | **OPEN** |
| Long name wrap (no h-overflow) | **PASS** | **OPEN** |
| Manrope resolved | **PASS** (`Manrope, sans-serif`) | **OPEN** |
| Dark pressed contrast on tint | **PASS** ≥7.2:1 (375 dark sample) | **OPEN** |
| Dark accent = production `rgb(253,164,175)` not `#c12b2f` | **PASS** | **OPEN** |

## Intentional residual (not CSS defects)

| Item | Proto | Product | Action |
|------|-------|---------|--------|
| Pressed tint bg light | `#fae9e8` | `--soft` → `rgb(252,240,237)` | Keep production token map |
| Pressed tint bg dark | `#3b2729` | `--soft` → `rgb(60,41,40)` | Keep |
| Pressed text dark | `#f49391` | `--accent-emphasis` → `rgb(253,164,175)` | **Required** contrast policy |

## Unresolved (publication / other owners)

1. **Full cabinet shell** — OwnerClientsGate, nav, page header (not П7).  
2. **Source-only ledger rows** — row `border-top`, selection tint, flat shell, sticky toolbar, edit panel gap (prior `VISUAL-COMPARISON-LEDGER.md`).  
3. **Vitest root include** for `P7.*` — CI owner.  
4. **Section blockers** — BLK-REFERRED, BLK-PERSIST (not CSS).

## Root handoff

- **Do not** cherry-pick whole `cursor/remcard-p7-acceptance-*` branch.  
- **Product patch candidate:** single file `observer.module.css` @ `c5c7f209`.  
- **Do not** describe 27 P7 + 14 component tests as page acceptance.

## Re-run plan

```bash
node audit/remcard-parallel-20261113/P7/measure-paired-residual-v2.mjs
npx vitest run --config audit/remcard-parallel-20261113/P7/vitest.p7.config.ts src/components/clients/observer/P7.observer-paired-residual.test.ts
```
