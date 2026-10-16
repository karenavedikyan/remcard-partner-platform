# R03-PARITY-TAIL RC (review corrections)

## Integration stack (no merges)

| Layer | Branch / PR | Role |
|-------|-------------|------|
| R03 UI base | `cursor/r03-ui-parity-b3e3` → platform **#18** | Accepted R03 shell |
| Profile RC | `cursor/agent-profile-parity-b3e3` → platform **#19** | Accepted separately (`ce2921e`, `reviewed_with_documented_exceptions`); **not** in #20 diff |
| Tail | `cursor/r03-parity-tail-b3e3` → platform **#20** | This pass |
| Navigator tail | `cursor/r03-parity-tail-b3e3` → navigator **#683** | Stacks on **#682** (`7a47405f`), not `main` |

Navigator chain documented on **#683**: #681 → #682 → #683.

## Fixes in this revision

- **Matched cert/client rows:** assert fixture id/alias, partner, categories, purchase state; ref search via `refSearchQuery`; impl cert selected by `data-parity-cert-id` (no `.first()` wrong row); PATCH `userAlias` after create; Anna task `Ремонт квартиры`, single linked cert.
- **Mobile LIST footer:** `mobileFooter` toolbar variant (no full-width action row); geometry assert in runner.
- **Lifecycle in lists:** purchase badge + muted lifecycle caption; terminal statuses do not show «Ожидает покупки».
- **Evidence metadata:** `captures.json` uses `platformGitSha` + dirty flag; runner writes real vitest/visual steps (build run separately before commit).
- **Capture:** sticky topbar scroll for 1440 cert crops; deterministic issuer display name `R03 Parity Agent`.

## SHAs (verify at push tip)

| Repo | Tip |
|------|-----|
| Platform | `TEST-RESULTS.json` → `platformSha` (commit bundling tail); capture HEAD `1c2435c7ef6835709c149209b2fdcc92364c4778` + dirty tree per `captureEvidence` |
| Navigator | `02c06daf0fa42ea71de3d55f4b988b4fe865522e` |

CAPTURED ≠ pixel PASS. Bonus «—» unchanged.
