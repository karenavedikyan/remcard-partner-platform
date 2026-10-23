# STORE-COMPANY-PROFILE-VISUAL-ACCEPT-03

**Scope:** artifacts-only visual acceptance on `feat/store-company-profile-parity-02`. **No application source changes.**

## Frozen code SHAs (verified via `git rev-parse`)

| Role | SHA |
|------|-----|
| B remcard-navigator | `cadb77e5d1834a6c45f778e49e9f23469eb62b46` |
| F artifact tip (this commit) | `git rev-parse HEAD` at commit time |
| F render source (unchanged app code) | `969f6545326118751e7217bddb18d55faa6d9bf3` |
| F turn96 verified base | `4db16dc16166cc9c5d25899b87b109fb288b592b` |

## Prior pair rejected

See `../visual-live-01.1/REJECTED.md`. Do not reuse those PNGs or manifest SHA fields.

## Capture method

- **Impl:** Next dev from `/tmp/parity-wt-f` @ `4b6ac04…`, `NODE_ENV=development`, `http://127.0.0.1:3022/profile/dev-fixture?...`
- **Ready gate:** visible `Dev-fixture в полном CabinetShell`; no prototype demo footer; real PNG via Playwright `main` element screenshot (`file` confirms PNG RGB).
- **Navigation:** real clicks for basics (summary → «Редактировать профиль» → step 0); team `?noOrg=1`; no `wizardStep` query forcing.
- **Ref:** prototype tar `382c3fa…` @ commit `9bc52fb9…` — automated ref batch **failed** (prototype «Сценарии прототипа» control not found in headless run); see `capture-run.log`.

## Closed impl screens (25 PNG)

| Block | Viewports |
|-------|-----------|
| STORE basics summary | 1440/375/320 × light/dark (320 light only for summary block) |
| STORE basics step 0 | 1440/375/320 × light/dark |
| STORE team no-org | 1440/375/320 × light/dark |
| COMPANY basics summary | 1440/375/320 × light/dark |
| COMPANY basics step 0 | 1440/375/320 × light/dark |

Per-frame SHA256 + bytes: `manifest.json`.

## Open (not accepted)

- STORE basics steps **1–3** (all viewports)
- STORE catalog steps **0–4**, pending, preview
- COMPANY basics **1–3**, catalog, pending, team
- **320** long-value / overflow scenarios
- **All ref+impl pairs** (no ref PNGs in this drop)
- Light/dark **paired diff table** vs prototype (refs missing)

## Observed impl sample (review notes, not code tasks)

On closed STORE summary @ 1440 light: fixture shows org **«Магазин Юг»**, Dev-fixture heading, AppShell sidebar — consistent with `src/app/profile/dev-fixture/page.tsx`. Detailed pixel diff vs prototype **not performed** (refs absent).

## Migration / release

Migration file unchanged, SHA256 `7e6394de73cdf92cb0bbb033fdfdaaa3536a0b75e335d9e45df22c996dc70635`, **not applied**. Visual progress **does not** authorize SQL or release.
