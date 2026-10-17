# REGISTRATION-01 — release report (draft RC)

Date: 2026-10-17  
Branch: `cursor/registration-01-b3e3`

## Release HEAD (implementation)

| Repo | Base branch | Branch HEAD |
|------|-------------|-------------|
| remcard-partner-platform | `release/prof-v1-20261007` | `72c7e50f32d600c9a876630c1bbc5f9b0df96e46` (unchanged base + registration commits on branch) |
| remcard-navigator | `release/prof-backend-v1-20261007` | `29069dc85e6add5fa28fe225ad490bc66ea6e92f` (unchanged base + registration commits on branch) |

## Frozen reference

| Item | Value |
|------|--------|
| Branch | `implementation/remcard-reference-20261014` |
| Commit | `c8bcab21` (prototype note `5503e01`) |
| Path | `docs/reference/registration-20261017/` |

### SHA256 (reference files touched for welcome/join)

| File | SHA256 |
|------|--------|
| `REGISTRATION-PROTOTYPE.md` | `10e8aa1d2cba4c428d5f55a1933021d78dd97b6b5f1e9cb169dceaeb1ce433e2` |
| `index.html` | `2449740779c5d9466431050082abc4fcdf1e1df735e628ac091df3722f6ac367` |
| `registration-welcome.css` | `08e33bc71d8ef32cc03f22f9d67055b50030862bdcbd1f6243922741c7501ae3` |
| `registration-entry.css` | `3e861309a9fbf6fc2afc30f2c16af7ee3649c5656de5dc9215c96869c9d8b63e` |
| `assets/partner-home.webp` | `b88016ee2c9395a9547107cfc2c4a3f08c0c2f854f8982e9c8ed02f7f411dc0d` |

Runtime asset copy (platform): `public/assets/registration/partner-home.webp` (same image bytes as reference).

## New vs legacy boundary

| Partner kind | Path when gates ON |
|--------------|-------------------|
| **Agent** | **New:** `/` welcome → `/join` → name → city → MAX/Telegram (`AuthFlow`) → consents → `POST /api/pro/registration/agent/finish` → fresh readiness → `/partners` |
| Specialist (MASTER) | **Legacy:** `/join` type picker → `/login?returnTo=/onboarding` → existing `OnboardingForm` |
| Store / Company | **Legacy:** same as specialist |
| Employee (membership) | **Legacy:** invite-only screen → `/login`; no org data without accepted invite |
| Returning user | **Legacy:** `/login` → cabinet; finish API refuses overwrite (`EXISTING_USER_*`) |

Gates (default **OFF**, fail-closed):

- Navigator: `PROF_REGISTRATION_WELCOME_ENABLED`, `PROF_AGENT_REGISTRATION_PATH_ENABLED`
- Welcome UI requires **both** (capabilities `welcomeEnabled = welcome && agent path`)
- remcard.ru partner entry: `NEXT_PUBLIC_PROF_PARTNER_ENTRY_REDIRECT` → `https://prof.remcard.ru/` (Header desktop + mobile partner login only; client login unchanged)

Rollout order: enable prof gates → deploy platform + navigator → set `NEXT_PUBLIC_PROF_PARTNER_ENTRY_REDIRECT` on remcard.ru.

## Reference → implementation mapping

| Reference | Implementation |
|-----------|----------------|
| Welcome copy + hero + 3 examples | `PartnerWelcome.tsx` + `partner-welcome.module.css` |
| Five-type picker | `RegistrationJoinFlow.tsx` (`/join`) |
| Agent name/city steps | same wizard + `registration/draft.ts` (sessionStorage, 7d TTL, per kind) |
| Auth boundary | existing `AuthFlow` + `registrationAgentJoin` → `/join?phase=finish` |
| Consents | existing `ConsentStep` / server legal docs |
| Agent cabinet entry | `/partners` after finish + readiness poll |
| Demo toolbar / demo codes | **Not ported** |

## Acceptance status

| Check | Status |
|-------|--------|
| Platform `pnpm run build` | **PASS** |
| Navigator `pnpm run build` | **PASS** |
| Platform unit: `auth-flow.test.ts`, `draft.test.ts` | **PASS** |
| Navigator unit: `profPartnerEntryNav.test.ts` | **PASS** |
| Navigator integration: `profAgentRegistrationFinish.integration.test.ts` (disposable PG) | **NOT_RUN** (no `DATABASE_URL` test DB in agent VM) |
| Browser E2E join→agent→cabinet | **NOT_RUN** (requires gates ON + live/test auth stack) |
| Visual impl/ref 1440/375 light/dark | **NOT_RUN** (captures not taken this turn) |
| remcard.ru link redirect | **CODE READY**; **NOT_RUN** live until redirect env enabled |

## Operator notes

- No production DB / merge / deploy performed in this RC.
- Admin login remains separate tab in `LoginExperience`; partner flow not mounted for admin mode.
- Pre-auth PII stays in sessionStorage only (not URL/logs/server draft).
