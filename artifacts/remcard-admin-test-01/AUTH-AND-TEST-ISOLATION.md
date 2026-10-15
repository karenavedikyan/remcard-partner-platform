# AUTH and test isolation (ADMIN-TEST-01.2)

## Central validator

- `verifySessionFromRequest` / `enforceProfTestPrincipalAccess` (`profTestSessionValidator.ts`)
- Wired into: `proAuth.getAuthenticatedUser`, `getServerUser`, `/api/auth/me` GET+PATCH, account consent withdraw
- `resolveProfTestContext` checks: claim `adminUserId` = delegation, active return slot, slot `adminTokenVersion` = admin user, flags + credential + staff ADMIN/OWNER

## Enforcement map (reachable by test principal)

| Route family | Verdict |
|--------------|---------|
| `/api/auth/me` GET/PATCH | Allow only with valid test session |
| `/api/pro/profile`, agent-profile draft/finish/status | Allow |
| `/api/account/consent`, `/api/account/cabinet-readiness` | Allow |
| `/api/pro/admin/test-users/return` | Allow |
| `/api/partnership/*` write, `/api/store/*`, staff/admin APIs | Deny (401/403 via proAuth) |
| `/api/upload` POST | **Public unauthenticated upload remains**; test JWT **denied** (removed from allowlist) |

## Rate limit

- Admin password: durable PG counters; **503 fail-closed** if storage unavailable (no memory fallback for this bucket).

## Evidence

- HTTP: `e2e-lifecycle-http.json` (login, 4 creates, enter, auth/me banner, negative invite, return)
- Unit: `profTestSessionValidator.test.ts`, `profTestRoutePolicy.test.ts`
