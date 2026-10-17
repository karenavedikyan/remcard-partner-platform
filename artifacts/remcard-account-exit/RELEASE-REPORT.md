# ACCOUNT-EXIT-01.2 — revocation bypass closure

## 01.2 (this RC)

- PATCH `/api/auth/me` cannot refresh revoked JWT
- Staff/admin guard paths honor `AuthSessionRevocation`
- Legacy keys: `legacy-sha256:<hash(token)>` (distinct tokens same second)
- Logout guard: CSRF required (no Origin-only bypass)
- Evidence: `FUNCTIONAL-SMOKE.json` PASS, 12 visual PNGs, 8/8 independent tests

---

# ACCOUNT-EXIT-01.1 — corrective RC

PRs: [navigator #687](https://github.com/karenavedikyan/remcard-navigator/pull/687), [platform #24](https://github.com/karenavedikyan/remcard-partner-platform/pull/24). Branch `cursor/account-exit-01-b3e3`. No merge/deploy/production.

## Defect fixes

| # | Issue | Fix |
| --- | --- | --- |
| 1 | Current logout only cleared cookie; JWT replay worked | `AuthSessionRevocation` + JWT `sid`; `logoutCurrentDevice` revokes session server-side; checked in `getAuthenticatedUser`, `auth/me`, `getServerUser` |
| 2 | Delegated current/all both bumped test `tokenVersion` | `exitProfTestSessionCurrentOnly` vs `exitAllProfTestSessionsForSubject` |
| 3 | `logout-all-sessions` callable without CSRF | `requireLogoutMutationGuard` on both logout routes; platform BFF forwards `X-CSRF-Token` + `remcard-csrf` cookie |
| 4 | Menu hid errors; drafts cleared before server OK | Alert + retry on trigger; `clearLocalSessionArtifacts` after success; `tryBeginAccountExit` cross-hook pending |

## Evidence

- Targeted tests: see `TEST-RESULTS.json`
- Functional A/B: `scripts/account-exit-functional-smoke.mjs` (disposable stack, not fixture-only)
- Visual: `scripts/account-exit-browser-acceptance.mjs` (honestly separate from A/B)
- Dev fixture gated: `src/app/dev-fixtures/layout.tsx` → `notFound()` in production

## Schema

Additive migration `20261017120000_auth_session_revocation` on disposable PG only until rollout.
