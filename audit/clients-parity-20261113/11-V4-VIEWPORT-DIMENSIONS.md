# V4-QA — viewport / media / font verification

**Prototype pin:** `3dc31836cd18d9209c20097f18b906dd276f7af6`  
**Fresh mounts only:** `v4-isolated-mount/` (`4c2e4cdf`) and `v4-isolated-mount-d1da9484/` (`d1da9484`).  
**Do not** cite `candidate-isolated-listview/` PNGs as proof for these SHAs (V3 inflated widths, e.g. claimed 320 → PNG **334**).

## Method

Playwright `viewport` + CDP `Emulation.setDeviceMetricsOverride` + **viewport** screenshot (`fullPage: false`) + PNG IHDR parse. Record `innerWidth`, `clientWidth`, PNG `width`/`height`, computed `fontFamily` / title / KPI sizes, `.stats` column count.

## Dimension truth (both themes, both SHAs)

| Viewport | `clientWidth`×`clientHeight` | PNG W×H | `innerWidth` (mobile) | Match claim |
|---|---|---|---|---|
| 1440×1000 | 1440×1000 | 1440×1000 | 1440 | **exact** |
| 1024×900 | 1024×900 | 1024×900 | 1024 | **exact** |
| 768×1024 | 768×1024 | 768×1024 | **782** | client+PNG OK; inner inflated +14 |
| 375×812 | 375×812 | 375×812 | **389** | client+PNG OK; inner +14 |
| 360×800 | 360×800 | 360×800 | **374** | client+PNG OK; inner +14 |
| 320×740 | 320×740 | 320×740 | **334** | client+PNG OK; inner +14 |

CSS `@media (max-width: …)` follows layout width ≈ `clientWidth` (KPI cols below). `innerWidth` inflation must **not** be used to invent a different media breakpoint story. V3’s “same-ish size across viewports” was PNG width inflation; V4 PNGs match requested widths.

## Fonts (isolated mount)

`document.body` / card title: **Manrope, system-ui, sans-serif** (explicit `@import` in harness). Title **15px**, KPI `dd` **20px** at all six viewports (light+dark) on both SHAs — real computed values, not assumed.

## KPI columns vs prototype `3dc31836` baseline

Prototype `computed-style-baseline.json` (light=dark same pattern):

| Width | Prototype cols | Candidate cols (`4c2e4cdf` & `d1da9484`) | Match |
|---|---|---|---|
| 1440 | 4 | 4 | yes |
| 1024 | 4 | 4 | yes |
| **768** | **4** | **2** (`@media (max-width: 768px)`) | **NO** |
| 375 | 4 | 4 | yes |
| **360** | **2** | **4** (cascade: 768→2 then `max-width:375` forces 4) | **NO** |
| **320** | **2** | **4** | **NO** |

**Six-viewport visual parity: NOT claimed.** Element-level KPI grid fails at 768 and ≤360 on the new candidate; old V3 screenshots are irrelevant.

## Prototype PNG heights note

Baseline mobile PNGs are taller than viewport (e.g. 320×740 shot file is **320×1032**) — full-content capture. V4 uses viewport-locked shots (320×740). Compare **computed columns/fonts**, not raw PNG height equality.
