# V2 visual baseline + candidate mount

## Commands (actual)

```bash
# Prototype etalon baselines (CSS via git show 3dc31836)
WALLET_QA_CHROME=/usr/local/bin/google-chrome \
  node scripts/clients-parity-20261113/capture-prototype-observer-baseline.mjs
# → ok: true, shots: 12

# Candidate synthetic mount + pixel overlay (impl tip)
WALLET_QA_CHROME=/usr/local/bin/google-chrome \
  IMPL_CANDIDATE_SHA=ffd4aa6130e92af5d95da21cfe5519133228a962 \
  node scripts/clients-parity-20261113/capture-candidate-observer-mount.mjs
# → ok: true, shots: 12, visualPass: 0, visualFail: 12, verdict: FAIL
```

Playwright’s bundled Chromium was missing (`npx playwright install` not run — avoid heavy dep churn). System Chrome used via `WALLET_QA_CHROME`.

## Evidence paths

| Kind | Path |
|---|---|
| Prototype shots | `audit/clients-parity-20261113/prototype-baseline/observer-compact-{light,dark}-{viewport}.png` |
| Prototype styles | `audit/clients-parity-20261113/prototype-baseline/computed-style-baseline.json` |
| Candidate shots | `audit/clients-parity-20261113/candidate-mount/observer-compact-*.png` |
| Candidate styles | `audit/clients-parity-20261113/candidate-mount/computed-style-candidate.json` |
| Overlay diffs | `audit/clients-parity-20261113/candidate-mount/diff/*.png` |
| Summary | `audit/clients-parity-20261113/candidate-mount/visual-diff-summary.json` |

## Viewports × themes

1440×1000, 1024×900, 768×1024, 375×812, 360×800, 320×740 @ DPR1 × light/dark = **12** shots each for prototype and candidate.

Role pages covered by shared compact-card CSS (synthetic fixture; full roles.html SPA not booted): **79 / 88 / 97 / 106 / 115** and nested partner targets **86 / 95 / 104 / 113 / 122** (same CSS rules; nested data still BLOCKED).

## Prototype KPI grid (compact personal cards)

| Viewport | stats columns | card height (light) |
|---|---|---|
| 1440 / 1024 / 768 | **4** | **125px** |
| 375 | **4** | 228px (wrap) |
| 360 / 320 | **2** | 281px |

## Candidate vs prototype (numeric)

| Viewport | cols proto/cand | heightΔ | pixelRatio (light) | Pass? |
|---|---|---|---|---|
| 1440 | 4/4 | +8 | ~0.027 | FAIL |
| 1024 | 4/4 | +8 | ~0.040 | FAIL |
| 768 | **4/2** | **+123** | ~0.045 | FAIL |
| 375 | 4/4 | −2 | ~0.094 | FAIL |
| 360 | **2/4** | **−55** | ~0.090 | FAIL |
| 320 | **2/4** | **−55** | ~0.105 | FAIL |

Root CSS cause in tip `observer.module.css`: `@media (max-width:768px)` forces 2-col stats; later `@media (max-width:375px)` restores 4-col, so ≤360 incorrectly stays 4-col. Prototype uses `@media(max-width:760px)` single-column compact-top but **keeps 4 KPI until max-width:360**.

## Verdict

**No visual PASS.** Artifacts exist; thresholds not met. Absence of artifact would also forbid PASS — here artifacts prove FAIL.

## Synthetic mount method

Isolated HTML + `git show <sha>:…/observer.module.css` (CSS module class tokens as globals). Matching Manrope font import. Fixture text aligned with prototype baseline (no data masking). **Not** a Next.js RSC mount; React unit tests separately prove interaction with fixtures (see vitest log).
