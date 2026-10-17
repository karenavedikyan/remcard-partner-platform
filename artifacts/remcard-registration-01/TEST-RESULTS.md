# REGISTRATION-01.3 — test results

Date: 2026-10-17

## Runtime SHA

**`813bdc5d5b832123d432cc62b6c65cf8e8e1e3f3`** (capture recorded in `visual-capture.json`)

## Executed this revision

| Check | Result |
|-------|--------|
| `pnpm run build` | PASS |
| `REGISTRATION_VISUAL_BASE=http://127.0.0.1:3022 node scripts/local/registration-01-visual.mjs` | PASS — `captureStatus=geometry-within-tolerance`; mobile grid + progress-top asserts |

## Carry-over (not re-run this revision)

| Check | Last known |
|-------|------------|
| `pnpm exec tsx --test` auth-flow + registration routing/draft (33) | PASS @ `680fd05` |
| `registration-01-browser-flow.mjs` (4/4 ready invite) | PASS @ `680fd05` |
| Navigator PG integration (7) | PASS @ `9fa871f3` |

## Measured (impl, browser)

| Viewport | Grid x / width | Progress stage tops |
|----------|----------------|---------------------|
| 1440 | 182 / 1076 (3×348) | inline row |
| 375 | 16 / 343 | 100, 100, 100, 100 |
| 320 | 16 / 288 | 100, 100, 100, 100 |

**Reference SHA:** `771cc658a415a5d05b964f29f675d32db449198b`

## NOT_RUN

Live MAX/Telegram, production deploy, backend/PG re-audit
