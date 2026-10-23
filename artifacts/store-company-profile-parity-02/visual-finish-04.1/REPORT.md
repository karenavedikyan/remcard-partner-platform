# VISUAL-FINISH-04.1

## Code (`b2cf92e` + pending fixture param)

- **CSS Modules fix:** `businessPwRoot` on wizard/summary roots; catalog classes composed on real nodes (`businessIntroLead`, `businessStepPanelTitle`, `businessFieldHintBlock`, `businessPublicNameStatus`, branch row layout).
- **Copy/layout:** restored «Для отправки на проверку» line; branch selector desktop row; navigator note after «Уже выбрано» via `afterSelectionNote`; STORE catalog `leadText` (not specialist generic).
- **Dev-fixture:** `?catalogStatus=PENDING` for pending acceptance (SSR only).

## Capture (`/tmp/visual-finish-04-capture.mjs`)

**12 pairs OK / 0 FAIL** (`capture-run.log`). Catalog step1 gate: fill public name → «Далее» → `data-catalog-step=1` + visible «Категории и этапы…» + active «Направления» on **both** sides.

| Coverage | Viewports |
|----------|-----------|
| STORE/COMPANY basics summary, STORE step2/4, catalog step0+1 | 1440 light |
| STORE basics summary | 375 light/dark, 320 long-name |
| STORE catalog pending, no-org | impl-only 1440 |

## PARTIAL (explicit blockers / not run)

- Working profile steps 3–4 (review/contacts) ref+impl matrix
- Catalog steps 2–4 + preview scroll crops
- COMPANY 375/320/dark
- Full data parity ref phone/email/directions vs impl fixture (noted in manifest; UI gates prioritized)

## SHA fields

- `captureCheckoutHead` / `implRenderSourceSha`: git HEAD at capture (see manifest)
- `implRenderHistoricalBaseSha`: `969f6545326118751e7217bddb18d55faa6d9bf3`
- B: `cadb77e5d1834a6c45f778e49e9f23469eb62b46`
