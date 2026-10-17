# REGISTRATION-01.5 delivery report

## HEAD (post-fix)

Recorded at commit time via `git rev-parse HEAD` in CI/local after push.

## Typecheck / build

| Repo | Command | Exit | Notes |
|------|---------|------|-------|
| remcard-partner-platform | `tsc --noEmit --incremental false` | 0 | Registration SSR/auth/CSS paths clean |
| remcard-partner-platform | `npm run build` | 0 | |
| remcard-navigator | `tsc --noEmit --incremental false` (full repo) | 2 | Pre-existing unrelated test/type debt (agent receivables, pg types, …) |
| remcard-navigator | registration slice (`webhook`, `commands`, `botCommandStage`) | 0 | P0 TS2345/TS2322 cleared |
| remcard-navigator | `npm run build` (+ `PLATFORM_INN`/`PLATFORM_OGRN` stubs) | 0 | |

## Tests (targeted)

- Navigator bot bundle (idempotency, delivery, stage, pipeline, max login, disposable URL guard): **17/17**
- Navigator safe webhook log + stage: **3/3**
- Platform SSR capabilities regression: unchanged **4/4** (prior)
- Browser flow script: extended consent UI chain (run after dev server)

## Prod root cause

- **Confirmed:** handler threw (`handleBotCommand failed`) on deployed `8bfdb193`; delivery not proven fixed until operator re-test.
- **Hypothesis (code):** soft-deleted `User.maxId` unique conflict before OTP send → fail-closed `identity_unavailable` in full PR; disposable repro via hardened smoke script only.
- **Diagnostics-only cherry-pick:** see navigator `artifacts/registration-01/DIAGNOSTICS-ONLY-CANDIDATE-8bfdb193.md`.

## P1 visual (changed pairs)

Re-capture after commit (`treeDirty: false`): welcome 375 dark (description lines + CTA spacing), data name/city 1440 light (1140 container + footer), providers 375 dark (scoped salmon tokens), OTP/wizard 320 smoke (progress label wrap).

## Documented product differences (not 1:1)

- Demo OTP copy / demo notifications bell (prototype-only).
- Header shell minor spacing vs frozen HTML (called out in pair metrics JSON, not counted as regressions).

## Status

**NO-GO** for prod MAX until operator controlled re-test after merge of full fix track. **NO** self-deploy.
