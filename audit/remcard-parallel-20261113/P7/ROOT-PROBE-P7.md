# Root full-container probe (П7 CSS only)

**Product file:** `src/components/clients/observer/observer.module.css`  
**Partial harness PASS @375/1440:** `paired-residual-v2.json` (typography, grid, bucket, contrast)  
**Full shell:** not verified — run in cabinet with `globals.css` + OwnerClientsGate.

## Selectors → expected computed (375 and 1440, both themes)

| Selector | Property | Expected |
|----------|----------|----------|
| `.bucketBtn[aria-pressed="true"]` | font-size | `12px` |
| | padding | `4px 12px` |
| | min-height / box height | ≥ `44px` |
| | color (dark) | `rgb(253, 164, 175)` |
| | background (dark) | `rgb(60, 41, 40)` (via `--soft`) |
| `.disclosure > summary` | font-size | `14px` |
| | min-height | `44px` |
| `.toggleLabel` | font-size | `12px` |
| `.personalRowGrouped` (grouped partner page) | grid-template-columns @1440 | contains `145px` and `150px` |
| | @375 | `24px` + two fluid tracks (no `0px`) |
| `.personalTag` | padding | `2px 8px` |
| | border-radius | `6px` |
| `.personalToolbar:has([data-observer-action="clear"])` | position | `sticky` (when selection active) |

## Runnable (agent VM, no install if Playwright present)

```bash
node audit/remcard-parallel-20261113/P7/measure-paired-residual-v2.mjs
npx vitest run --config audit/remcard-parallel-20261113/P7/vitest.p7.config.ts \
  src/components/clients/observer/P7.observer-paired-residual.test.ts \
  src/components/clients/observer/P7.observer-prototype-source-fixes.test.ts \
  src/components/clients/observer/P7.observer-ledger-fixes.test.ts
```

## Blockers (not CSS)

| Blocker | Owner |
|---------|-------|
| BLK-REFERRED / persistence APIs | P2 / backend |
| Row `[data-selected]` tint (no attr in JSX) | P4 row |
| Full section READY | Root assembly + contracts |
