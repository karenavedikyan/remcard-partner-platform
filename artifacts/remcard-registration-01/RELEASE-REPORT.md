# REGISTRATION-01 / 01.1 — release report (draft RC)

Date: 2026-10-17  
Review reference: navigator `2cba890`, `docs/reference/registration-20261017/review-01/`  
Implementation PRs: platform [#26](https://github.com/karenavedikyan/remcard-partner-platform/pull/26), navigator [#689](https://github.com/karenavedikyan/remcard-navigator/pull/689)

## Controlled rollout (no production changes in this RC)

1. Deploy **compatible** platform + navigator with gates **OFF** (`PROF_REGISTRATION_WELCOME_ENABLED`, `PROF_AGENT_REGISTRATION_PATH_ENABLED`, `NEXT_PUBLIC_PROF_PARTNER_ENTRY_REDIRECT`).
2. Staging/local acceptance (browser + disposable PG).
3. Enable gates on staging → smoke agent path + returning user + admin login.
4. Production: gates ON → operator smoke → `NEXT_PUBLIC_PROF_PARTNER_ENTRY_REDIRECT` on remcard.ru (partner entry only).

## REGISTRATION-01.1 fixes (this revision)

### Server finish (navigator)

- Block finish when **any** blocking consent missing (TERMS, PERSONAL_DATA, **PUBLIC_OFFER_PRO** during onboarding).
- No overwrite of established accounts when `canAccessCabinet=false` (e.g. stale TERMS on existing AGENT).
- Re-read user + readiness **inside** advisory lock; update via transaction client.
- Owner/employment/mixed-wallet guards before promotion.
- Strict JSON body parser (`profAgentRegistrationFinishBody.ts`); invalid JSON/null → 400, no mutation.
- **Probes:** `registration-review.probe.test.ts` — **2 PASS** (mock DB).

### Platform UX / flow

- Welcome copy/layout aligned to frozen reference (`registration-welcome.js`): accent on «клиентами,», short example tabs, reciprocity text.
- CTA contrast fix (primary button no longer overridden by global link color).
- Header: **BrandMark only** (no duplicate wordmark).
- Join: progress steps, no internal legacy labels; embedded **AuthFlow** (no double hero).
- Registration consents in join auth (incl. PUBLIC_OFFER_PRO) via `registrationConsentRequirements`.
- Returning ready user + `registrationAgentJoin` → **cabinet** (`/partners` or safe `returnTo`), not `/join` loop.
- Login recovery links carry `registration=agent` + `returnTo=/join?phase=finish`.
- Draft: safe sessionStorage + in-memory fallback; owner binding; wizard step persistence; legacy onboarding preserves `partnerType` query.

## Tests (this agent run)

| Command | Result |
|---------|--------|
| Platform `tsx --test src/lib/auth-flow.test.ts src/lib/registration/draft.test.ts` | **26 PASS** |
| Navigator `vitest run registration-review.probe.test.ts profPartnerEntryNav.test.ts` | **4 PASS** |
| Navigator `profAgentRegistrationFinish.integration.test.ts` | **SKIPPED** (DATABASE_URL not prof-r01 disposable test DB) |
| Platform `pnpm run build` | **PASS** |
| `scripts/local/registration-01-visual.mjs` | **NOT_RUN** (requires local dev stack + mocked capabilities) |

## Still NOT_RUN (explicit)

- Live MAX/Telegram auth smoke (isolated mock upstream ≠ live).
- Full PG/BFF matrix on disposable loopback (blocked: test DB policy URL not configured in VM).
- remcard.ru live click-through with redirect flag ON.

## New vs legacy boundary (unchanged)

| Kind | Path |
|------|------|
| Agent (gates ON) | Welcome → `/join` → name → city → auth/consents → finish API → `/partners` |
| Specialist / store / company | Type picker → login → `/onboarding?partnerType=…` |
| Employee | Invite-only screen → login; no org data without invite |
| Returning user | Login → cabinet; finish API refuses overwrite |
