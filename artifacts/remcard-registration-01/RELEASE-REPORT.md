# REGISTRATION-01.3 — release report (draft RC)

Date: 2026-10-17  
PRs: platform [#26](https://github.com/karenavedikyan/remcard-partner-platform/pull/26), navigator [#689](https://github.com/karenavedikyan/remcard-navigator/pull/689)  
Reference: navigator `implementation/remcard-reference-20261014`, `docs/reference/registration-20261017/`

## Changes (01.3 only)

1. **Ready user + invite:** `resolveReadyRegistrationAgentJoinDestination` / `resolveDestinationAfterAuth` preserve `/invite/{token}` (or safe nested `returnTo`) when auth completes from agent registration join; plain `/join` still falls back to `/partners`. No fresh finish for established accounts.
2. **Join visual:** linear type icons, four-column progress labels («Тип партнёра», «Ваши данные», «Подтверждение», «Кабинет»). Visual runner: isolated contexts, viewport/theme/step verify before capture; `reg012-*` marked superseded in `visual-capture.json`.

## HEAD (after push)

| Repo | SHA |
|------|-----|
| remcard-partner-platform | _(see branch tip)_ |
| remcard-navigator | `9fa871f3` (unchanged) |

## Evidence

- `TEST-RESULTS.md` — commands and counts  
- `visual-capture.json` — per-capture viewport, PNG size, step, theme, code SHA  
- `screenshots/reg013-*` impl + `ref-types-375-*` from frozen reference  
- `browser-flow-report.json` — 4 checks  

## Remaining visual gaps (honest)

- No frozen 1440px type-picker PNG in reference repo (375 ref only).  
- Icon stroke style aligned in code; not pixel-scored against prototype.  
- Welcome hero still differs from reference export (accepted earlier).  

## Status

**READY_FOR_REVIEW** for 01.3 scope after executed platform tests above. Production deploy / live IdP still out of scope.
