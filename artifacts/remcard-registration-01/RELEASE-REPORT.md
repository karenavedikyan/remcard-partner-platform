# REGISTRATION-01.2 — release report (draft RC)

Date: 2026-10-17  
Review reference: navigator `771cc65`, `docs/reference/registration-20261017/review-011/`  
Implementation PRs: platform [#26](https://github.com/karenavedikyan/remcard-partner-platform/pull/26), navigator [#689](https://github.com/karenavedikyan/remcard-navigator/pull/689)

## Scope (01.2)

Same PR branches only. No merge, deploy, production flags, or production DB changes. Accepted cabinets not re-audited.

### Navigator

- `registrationFinishBlockedByConsents`: any `missingConsents` entry (including `no_active_document`) blocks finish.
- First successful finish: `idempotentReplayed: false`; true replay via `already_ready` / completed state only.
- Disposable PG integration on `postgresql://remcard_r01:remcard_r01@127.0.0.1:5432/remcard_r01_test`.

### Platform

- Draft owner enforced after auth subject is known; no silent re-bind of another user’s draft.
- Wizard restores saved step including `auth`; employee invite + legacy `partnerType` routing preserved.
- Welcome passes `invite` / `returnTo` search params; reference-aligned join progress (4 stages, type icons, login hint).
- Dark CTA uses theme foreground on accent (contrast asserted in visual runner).

## Tests and evidence (this agent run)

| Command | Result |
|---------|--------|
| Platform `pnpm exec tsx --test src/lib/auth-flow.test.ts src/lib/registration/routing.test.ts src/lib/registration/draft.test.ts` | **30 PASS** |
| Platform `pnpm run build` | **PASS** |
| Navigator `vitest run registration-review.probe.test.ts registration-011-review.probe.test.ts` | **4 PASS** |
| Navigator `vitest run profPartnerEntryNav.test.ts` | **2 PASS** |
| Navigator `DATABASE_URL=…/remcard_r01_test vitest run profAgentRegistrationFinish.integration.test.ts` | **7 PASS** |
| `REGISTRATION_VISUAL_BASE=http://127.0.0.1:3020 node scripts/local/registration-01-visual.mjs` | **PASS** (8 PNG + contrast/overflow assertions) |
| `REGISTRATION_VISUAL_BASE=http://127.0.0.1:3020 node scripts/local/registration-01-browser-flow.mjs` | **3/3 PASS** |

Local stack for UI evidence: navigator `:3021` with `PROF_REGISTRATION_WELCOME_ENABLED` + `PROF_AGENT_REGISTRATION_PATH_ENABLED`; platform `:3020` with `REMCARD_API_BASE_URL=http://127.0.0.1:3021`.

Artifacts:

- `artifacts/remcard-registration-01/screenshots/reg012-*.png`
- `artifacts/remcard-registration-01/visual-capture.json`
- `artifacts/remcard-registration-01/browser-flow-report.json`

Commit SHAs for this RC revision are recorded in the PR heads after push (see PR checks / branch tip).

## Still NOT_RUN (explicit)

- Live MAX/Telegram OAuth on production/staging identity providers.
- BFF finish against non-disposable shared staging DB.
- remcard.ru partner-entry redirect with production flag ON.

## Controlled rollout (unchanged)

Gates remain **OFF** in production until operator acceptance after merge.
