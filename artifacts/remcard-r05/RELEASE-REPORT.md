# R05.4 — RELEASE REPORT

| Repo | PR | Branch |
|------|-----|--------|
| remcard-navigator | [#686](https://github.com/karenavedikyan/remcard-navigator/pull/686) | `cursor/r05-agent-receivables-b3e3` |
| remcard-partner-platform | [#23](https://github.com/karenavedikyan/remcard-partner-platform/pull/23) | `cursor/r05-agent-receivables-b3e3` |

## Scope (three closure items)

### 1. Mobile order detail layout
- Breakdown rows stack inside `orderDetailShell` (container queries); sum uses `word-break: break-all` so NBSP amounts wrap.
- Acceptance checks **shell bounding boxes** for sum + four `dd` values and `document.scrollWidth` on 375/320 (table scroll isolated in `.lineTableWrap`).
- Loading/error/retry unchanged.

### 2. Real dark reference (375)
- Frozen prototype theme via **`[data-action="theme"]`** (internal `i.theme`), not DOM-only override.
- Probes: `data-theme`, settlement-demo computed bg (dark → luminance &lt; 128).
- **Distinct SHA:** `ref-r05-partners-375-light.png` ≠ `ref-r05-partners-375-dark.png`.
- Matched drill captures: `ref-r05-{partners,orders,order-detail}-375-{light,dark}.png` and `impl-r05-{partners,orders,order-detail}-375-{light,dark}.png`.
- Added `impl-r05-order-detail-320-{light,dark}.png`.

### 3. Small CSS
- «Вид данных»: inline `viewControl` row (reference-style label + select).
- «Поиск и фильтры»: bottom border only, transparent background.

## Honest limits
- `visualParityOk: false` — CAPTURED pairs, not pixel PASS.
- Navigator **6f0e8a415d08df2b4da5f1e3499a58704afc4bb9** unchanged (no backend delta in R05.4).

## R05.4 closure (runner)
- `node --check scripts/r05-browser-acceptance.mjs` — recorded in `TEST-RESULTS.json` (comma fix in layout helper).
- Order detail 375/320 PNGs: element crop of `[data-testid="agent-r05-order-detail"]` after `scrollTo(0)` (no sticky chrome over data).

See `TEST-RESULTS.json` for HEAD SHAs, theme probes, layout metrics, and section PASS/FAIL.
