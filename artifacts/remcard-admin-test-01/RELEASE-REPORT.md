# ADMIN-TEST-01.3 — browser + BFF lifecycle gate

**Date:** 2026-10-15  
**Branch:** `cursor/admin-test-01-b3e3` (PRs [#679](https://github.com/karenavedikyan/remcard-navigator/pull/679) / [#13](https://github.com/karenavedikyan/remcard-partner-platform/pull/13))

| Repo | Reviewed code HEAD | Role |
|------|-------------------|------|
| remcard-navigator | `f027f49e8099fa7988dfe9cabc56e066a250d552` | Backend / auth / test users |
| remcard-partner-platform | `8be085809432b3cdcefdf54c37b5631598c36061` | Admin UI / BFF / R02 wizard |

| PR full HEAD (2026-10-15 preflight) | navigator `d2d887f62915eb5c48466a383a9ccc604c623c1d` · platform `7f2b940e3bcb11db1c254fa1fcec0f353b8537ae` |
| Post-review delta (reviewed→HEAD) | navigator: `scripts/admin-test-012-lifecycle.ts` only (+5) · platform: acceptance scripts + `artifacts/remcard-admin-test-01/*` only — **no `src/` or SQL changes** |

## Controlled release prep (ADMIN-TEST-01.3) — **NO EXECUTION**

**Owner gate:** merge / deploy / production migration apply / flag enable / credential bootstrap / real-admin assignment **PROHIBITED** until separate written confirmation. Tandoor not in scope.

### PR / CI (verified this turn)

| PR | Base | Mergeable | CI |
|----|------|-----------|-----|
| [#679](https://github.com/karenavedikyan/remcard-navigator/pull/679) | `release/prof-backend-v1-20261007` @ `f68a9661` | MERGEABLE (GitHub: UNSTABLE) | **FAIL** — Vercel account/deployment blocked |
| [#13](https://github.com/karenavedikyan/remcard-partner-platform/pull/13) | `release/prof-v1-20261007` @ `7c1e435f` | MERGEABLE (CLEAN) | No checks reported on PR |

### SQL checksums (verified on branch tip — match `TEST-RESULTS.json` / manifest)

| Migration | SHA256 |
|-----------|--------|
| `20261015103000_admin_test_01` | `cfade237b2b2f93f42399eca6d9495f4f13099b7121bc40c6efd535bef1af4fa` |
| `20261015200000_admin_test_01_1` | `bce02cecc16ba667f0c485cab436e45e5008f4fc209ecb6b61abba24136b72a1` |

### Production preflight

**NOT_RUN** — no read-only production connect/deployed SHA/DB state verified in this agent (no approved production scope). Documented target from repo manifest only: host `192.168.0.4`, port `5432`, database `remcard` (operator must confirm live endpoints).

### Operator scope (single approval packet — do not execute from agent)

1. **Merge (after owner OK + CI policy):** navigator #679 → `release/prof-backend-v1-20261007` @ **`d2d887f6`**; then platform #13 → `release/prof-v1-20261007` @ **`7f2b940`** (platform BFF depends on deployed navigator API).
2. **Target apps (names from repo docs, not verified live):** API `https://remcard.ru` (navigator); cabinet `https://prof.remcard.ru` (platform); platform env `REMCARD_API_BASE_URL` → production API base; `NEXT_PUBLIC_APP_URL` → cabinet origin.
3. **DB migrations (navigator only, controlled runner):** `node scripts/prof-admin-migrate.mjs --phase=before` → dry-run `apply` → `apply --apply` → `--phase=after` with operator production ack env (`PROF_ADMIN_MIGRATE_ALLOW_PRODUCTION=1`, `PROF_ADMIN_MIGRATE_EXPECTED_HOST`, `PROF_ADMIN_MIGRATE_EXPECTED_PORT`, `PROF_ADMIN_MIGRATE_EXPECTED_DB`) and `DATABASE_URL`/`DIRECT_URL` to **production** `remcard` — **not** disposable test DB. Checksums as table above; refuse on drift.
4. **Deploy:** backend build/deploy to API app; then platform build/deploy to cabinet app — **flags remain OFF** until step 5 dependencies met.
5. **Flags (navigator runtime, default off):** `PROF_ADMIN_PASSWORD_LOGIN_ENABLED=1`, `PROF_ADMIN_TEST_USERS_ENABLED=1` only after migrations applied on production + both apps deployed at approved SHAs. Agent profile wizard smoke also requires existing `PROF_R02_AGENT_PROFILE_ENABLED=true` on navigator if not already enabled in prod.
6. **Credentials (operator prepares in vault/secure env — no values in chat/logs):** production `JWT_SECRET` (unchanged unless rotation planned); optional `REMCARD_API_BASIC_*` on platform if staging Basic Auth used; **dedicated test staff admin** user id for bootstrap — **`real-admin` / production OWNER assignment OUT OF SCOPE** until separately approved. Bootstrap: `tsx scripts/prof-admin-bootstrap-credential.ts --user=<staffAdminUserId> [--apply]` with `--operator-production` + `PROF_ADMIN_BOOTSTRAP_ALLOW_PRODUCTION=1` + expected host/db/port guards (password via stdin only).
7. **Maintenance / backup:** **NOT_RUN** — operator decides freeze window; ADR rollback is **flags off + revoke delegations**, not blind `migrate down` / reseed / truncate. No automatic backup/restore in this prep.
8. **Post-approval smoke (test-only, no production writes beyond test users):** health/readiness + deployed SHAs; disposable **test-admin** login; create/enter test user; consent UI; banner/shell; R02 draft/reload/finish; BFF `profileComplete` without draft; return/re-enter; reset/disable **test user only**; session revocation via `auth/me` body (`user: null` / `PROF_TEST_SESSION_INVALID` on HTTP 200 is expected). Password change only on pre-approved **non-production** test-admin account. Screenshots without PII/secrets. **No smoke executed in this turn.**

### Future execution constraints (when owner approves)

- Merge only at owner-approved HEAD SHAs above; no reset/reseed/drop/truncate/force migrate down.
- Do not replace entire env blobs; toggle only named flags when dependencies ready.
- On any step failure: **STOP** subsequent steps; no automatic DB rollback.
- Status **RELEASED** only after both apps + migrations + flags (if used) + approved smoke; else **PARTIAL** / **STOP**.

## Verified in prior gate (loopback `remcard_admin_test_012` only)

1. **Browser admin path:** `/login?mode=admin` → create AGENT/MASTER/STORE/COMPANY with type check → enter agent → mandatory consent UX (no DB seed bypass) → test banner + agent shell → R02 draft/reload, skip, finish → BFF GET `profileComplete` without draft → return → re-enter → reset scope → disable → admin password change.
2. **Compact negatives:** real-user reset no-op; stale test/admin sessions rejected via `auth/me` (`user: null` / `PROF_TEST_SESSION_INVALID`); return replay 403; partnership invite blocked via BFF.
3. **Evidence:** `browser-lifecycle.json`, screenshots (admin list, banner, profile saved at 1440/375, 320 smoke), `e2e-lifecycle-http.json` (direct HTTP, complementary).

## Still NOT_RUN (by policy)

- Production Timeweb connect / migration `apply` on `192.168.0.4:5432/remcard`
- Production flag enablement, real-admin assignment, merge/deploy
- Full cron/outbox matrix

## Recommendation

**Ready for operator review** of controlled publication (migration + flags + credentials) based on local disposable acceptance. Production steps remain gated until explicit operator sign-off.

See `TEST-RESULTS.json`, `USER-GUIDE.md`, `MIGRATION-AND-RELEASE.md`.
