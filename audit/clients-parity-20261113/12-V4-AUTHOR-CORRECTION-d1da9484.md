# V4 — named candidate `4c2e4cdf` vs subsequent correction `d1da9484`

Author branch: `cursor/remcard-cabinet-nav-r5-final-20261103`  
`4c2e4cdf` → `d1da9484` (`fix(clients): REMCLIENTS-V4 MotionStat, prop forward, patch manifest`)

## Computer findings on `4c2e4cdf` (confirmed on fresh mount)

| Finding | Evidence |
|---|---|
| Lowercase JSX `<motionStat>` | `ObserverPartnerDetailView.tsx` — intrinsic HTML; **dt/dd absent**; `motionStatIntrinsicCount=2` all 6×2 viewports |
| `void canLinkOnboardingHistory` | `ClientsListWorkspace.tsx` — discards prop; Gate not forwarded |
| Forbidden packaging | Gate rewrite, Context strip, `(cabinet)` route, deleted `onboarding-step/` helper, vitest.config churn vs `57ca4680` |
| Partner open / back | open works; detail labels **missing** due to motionStat |
| Edit form | present; **save disabled**; cancel closes form; **no fake save** |
| KPI cols | 768→2, ≤360→4 (wrong vs prototype 768→4, ≤360→2) |

Fresh artifacts: `v4-isolated-mount/` (not V3 `candidate-isolated-listview/`).

## What `d1da9484` fixes

| Item | Result on fresh `v4-isolated-mount-d1da9484/` |
|---|---|
| `<MotionStat>` PascalCase | **labels/values render** (`dtCount=2`, `ddCount=2`, intrinsic count 0) |
| Remove `void canLink…` | Workspace JSX forwards via `Gate` cast |
| Props unit test | author-added source string checks |

## What `d1da9484` does **not** fix

| Item | Status |
|---|---|
| EXACT `57ca4680` Gate | still manual R03/R06 rewrite; **no** `canLink` param |
| Context `canLink` API | still removed |
| Route | still `(cabinet)/clients/page.tsx` without `canLink` / helper import |
| History helper | still **deleted** |
| vitest.config | still diverged |
| KPI media queries | unchanged — still FAIL vs `3dc31836` |
| Persistence | save remains **disabled** → **BLOCKED_PERSISTENCE**, not PASS |

## Interaction verification (`d1da9484`, all 6 viewports × 2 themes)

- Partner open → detail with labels: **OK**
- Back → list: **OK**
- Checkbox selection toggle: **OK** (spot-check 1440)
- Personal edit form open → cancel: **OK**
- Save control disabled / no fake persist: **OK** (UI-only; persistence still blocked)

## Delivery verdict

Correction improves observer detail JSX and removes the `void` discard, but **section remains not accepted** until forbidden packaging matches `57ca4680` and visual/KPI parity + real contracts land.
