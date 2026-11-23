# RemCard PROF mini-app — public beta (code-only rollout notes)

Authority for pilot vs public beta is **server-side** (`remcard-navigator` env). The partner-platform shell shows API errors/messages as-is; no client allowlist.

## Environment (Timeweb / PROF origin)

| Variable | Default | Role |
|----------|---------|------|
| `PROF_MINI_APP_ENABLED` | off | **Master kill switch**. When off, mini-app routes return `NOT_FOUND` / session blocked — same as closed pilot. |
| `PROF_MINI_APP_PUBLIC_BETA_ENABLED` | off | **Opt-in public beta**. Has no effect unless master is on. When on, **only** `PROF_MINI_APP_PILOT_USER_IDS` allowlist is bypassed. |
| `PROF_MINI_APP_PILOT_USER_IDS` | empty | Closed pilot allowlist (unchanged semantics when public beta is off). |

Do **not** change allowlist contents as part of beta enablement unless intentionally shrinking closed pilot.

Messenger signature, linked PROF account, consent/cabinet gate, `remcard-token` + `remcard-mini-app-session`, role (PRO only), org/branch ACL, certificate create limits, store scan, and CRM rules are **unchanged** and still enforced on routes.

## Rollback

1. Set `PROF_MINI_APP_PUBLIC_BETA_ENABLED` unset/`false` (or remove from env).
2. Keep or set `PROF_MINI_APP_ENABLED=false` to disable entirely (instant fail-closed).
3. Redeploy/restart PROF process (`scripts/start-timeweb.mjs` — no new migrations required for this change).
4. Verify: non-allowlisted user receives `NOT_FOUND` on bootstrap/session when only master is on without public beta.

## Timeweb `scripts/start-timeweb.mjs` — migration gates (no run required here)

Startup runs **additive schema gate scripts only** (not `prisma migrate deploy` / push / seed):

1. `scripts/apply-partnership-link-invite-resurface-migration.mjs`
2. `scripts/apply-partnership-link-invite-author-labels-migration.mjs`
3. `scripts/apply-client-appeals-p149-migration.mjs`

Optional maintenance scripts run **only** when env is exactly `true`:

- `STAGING_RESTORE_ALLOWED` → `staging-restore.mjs`
- `STAGING_AUDIT_ALLOWED` → `staging-audit.mjs`
- `STAGING_FILE_URLS_ALLOWED` → `staging-file-urls.mjs`
- `CUTOVER_RESTORE_ALLOWED` → `cutover-restore.mjs`
- `INTEGRATION_PROBE_ALLOWED` → `integration-probe.mjs`

**This public-beta change does not add or alter any of the above.**

### Verify no schema writes from existing logs / read-only checks

- Inspect deploy/start logs for the three `apply-*-migration.mjs` lines above; each is idempotent additive gate, not a full migrate deploy.
- Confirm none of `STAGING_*` / `CUTOVER_*` / `INTEGRATION_PROBE_*` were `true` unless deliberately run in that environment.
- Read-only: hit `GET /api/pro/mini-app/bootstrap` with invalid session → expect `401`/`403`, not DB errors.
- Grep runtime logs for `prisma migrate` or `migrate deploy` — should not appear on normal Timeweb startup from `start-timeweb.mjs`.

## Guarded routes (BE audit)

All call `isProfMiniAppEnabled()` then `isProfMiniAppPilotOpenForUser()` after auth/link/session where applicable:

- `POST /api/pro/mini-app/session`
- `GET /api/pro/mini-app/bootstrap`
- `GET /api/pro/mini-app/scan`
- `GET /api/pro/mini-app/certificate/options`
- `POST /api/pro/mini-app/certificate` (also `src/app/api/store/certificate/route.ts` mini-app entry)

FE BFF (`remcard-proxy`) forwards these paths only; it does not implement allowlist logic.