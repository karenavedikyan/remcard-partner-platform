# RemCard R02 release candidate

## Repos / branches

| Repo | Base branch | Base SHA | Head branch |
|------|-------------|----------|-------------|
| remcard-navigator | `release/prof-backend-v1-20261007` | `810f109830df2154e05ca5f3d0ee736779e8cb44` | `cursor/r02-agent-profile-b3e3` |
| remcard-partner-platform | `release/prof-v1-20261007` | `e1fceb679179d917f2c7fa102f6585f2bfd78090` | `cursor/r02-agent-profile-b3e3` |

PR links: see GitHub after push (this report generated pre-PR).

## Ready for users (when gates enabled)

- Explicit **AGENT activity** entry via `/api/pro/agent-activate` or existing profile activities flow.
- **4-step agent profile** (О себе → Аудитория → Контакты → Проверка) with server draft, version conflict handling, finish → working profile fields.
- **Compact overview** after save with user ID and «Редактировать профиль».
- **Requisites** tab: create, primary, apply-for-next-payout, revise (archives prior version).
- **R01 eligibility tweak**: pilot shell requires explicit `AGENT` in `partnerActivities`, not wallet-only AGENT-like.

Not in R02: certificates/clients (R03), partners search (R04), «Мне должны» (R05), production deploy.

## Migrations

- `20261015120000_prof_r02_agent_profile` (additive).
- Runner: `node scripts/prof-r02-migrate.mjs before|apply|after` (loopback guard via `resolveProfHDatabaseTarget`).

## Env names (no secret values)

- Backend: `PROF_R02_AGENT_PROFILE_ENABLED`, `PROF_R01_AGENT_NAV_ENABLED` (unchanged default off).
- Platform: `REMCARD_API_BASE_URL`, `NEXT_PUBLIC_APP_URL`.

## Release sequence

1. Apply backend migration on staging DB (controlled runner).
2. Deploy backend with `PROF_R02_AGENT_PROFILE_ENABLED=0` (verify legacy).
3. Deploy frontend proxy allowlist + UI.
4. Enable `PROF_R02_AGENT_PROFILE_ENABLED` on staging only; production smoke separate from this RC.

## Preflight / rollback

- **Preflight**: `prof-r02-migrate.mjs before`, build + unit tests, optional route integration on disposable DB.
- **Rollback**: leave gate off; additive tables safe; no backfill of historical payout snapshots.

## Blockers

- Route integration + visual pairs **NOT VERIFIED** in cloud VM (no test DB / no authenticated local stack).
- Production smoke **NOT RUN** (explicitly out of scope).

## Visual deviations

- Pending paired screenshot pass against frozen ZIP (not captured in this environment).
