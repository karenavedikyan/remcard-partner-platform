# Auth, sessions, test isolation (ADMIN-TEST-01)

## Admin password credential

- Table `AdminPasswordCredential` → existing `User` with `staffRole` ADMIN or OWNER only.
- Login normalized lowercase; verify uses scrypt + timing-safe compare; unknown login runs dummy scrypt.
- Endpoint: `POST /api/pro/admin/auth/password-login` (flag + rate limit `auth:admin-password` key `IP:admin-login:<login>`).
- Generic error `INVALID_CREDENTIALS` for wrong password / wrong role / disabled credential.

## Delegated test session (confused-deputy mitigation)

1. Admin authenticated with staff JWT in `remcard-token`.
2. **Enter:** server creates `ProfTestDelegation` + `ProfAdminReturnSlot`; replaces `remcard-token` with **test user** JWT containing `profTest: { delegationId, adminUserId }`; sets HttpOnly `remcard-admin-return=<slotId>` (host-only, no Domain).
3. Frontend never receives admin JWT while in test context.
4. **Return:** `POST /api/pro/admin/test-users/return` validates active delegation + slot; restores admin JWT; revokes delegation; clears return cookie.

Test user JWT alone cannot call `/api/pro/admin/*` (requires staff on admin routes). Admin cookie cannot impersonate arbitrary userIds (enter checks `isProfTestUser` + disabled state).

## Test marker

- `User.isProfTestUser` set only in `createProfTestUser` service; not accepted from profile PATCH.
- Audit: `PROF_TEST_USER_CREATED`, `PROF_TEST_ENTER`, `PROF_TEST_RESET`.

## Enforcement map (fail-closed intent)

| Family | Test principal |
|--------|----------------|
| `/api/pro/admin/*` | 403 |
| Selected outbound writes (notifications invite, catalog submit) | 403 `PROF_TEST_BLOCKED` via `profTestGuard` (extend per release) |
| Public partnership/catalog list queries | exclude `isProfTestUser: true` (apply in search routes incrementally) |
| Background jobs | Document: test users must not enqueue real Telegram/SMS (NOT VERIFIED all workers) |

## Revocation

- Flag off → endpoints 404 DISABLED; existing delegations should be revoked on deploy script (manual step documented in MIGRATION-AND-RELEASE.md).
- Admin `tokenVersion` bump invalidates sessions; disable test user blocks enter.
