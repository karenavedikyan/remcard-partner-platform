# AUTH and test isolation (ADMIN-TEST-01.1)

## Serialization (fixed)

- Platform `remcardFetch` stringifies `body` once (`api-client.ts`).
- `prof-admin-api.ts` and admin UI pass **objects**, not `JSON.stringify(...)`.
- Regression: `src/lib/prof-admin-api.test.ts` asserts `typeof JSON.parse(body) === "object"` and field preservation.

## Central enforcement

- `enforceProfTestPrincipalAccess` in `proAuth.getAuthenticatedUser` / `getProfCabinetUser` path:
  - Test-marked users require valid `ProfTestDelegation` + flags on + admin actor still valid.
  - Fail-closed route allowlist: `src/lib/profTestRoutePolicy.ts` (profile/draft/finish/requisites/preferences, consent/readiness, return, upload).
  - Default **deny** for partnership invite, store order, admin APIs, etc.
- `catalogExcludeProfTestUsers()` wired into `userPublishedInCatalogWhere()`.

## Return slot binding

- `ProfAdminReturnSlot` stores `delegationId` + `testUserId`.
- `returnFromProfTest` transaction: slot consume-once, delegation revoke, test user `tokenVersion++`, admin `tokenVersion` match on slot.

## Session TTL

- Admin password JWT/cookie max-age **12h** (Telegram/MAX remain 30d).
- Test delegation JWT **12h**; cookie aligned on enter.

## Rate limit

- `auth:admin-password`: independent durable buckets `ip:*` and `login:*` via `AuthRateLimitCounter` (PG fallback to in-memory).

## Enforcement map (actual surfaces)

| Surface | Test principal |
|---------|----------------|
| `GET/PATCH /api/pro/profile` | Allow |
| `/api/pro/agent-profile/*` (draft/finish/status) | Allow |
| `/api/account/consent`, `/api/account/cabinet-readiness` | Allow |
| `POST /api/pro/admin/test-users/return` | Allow |
| `POST /api/partnership/invite`, `/api/store/order`, `/api/pro/admin/*` (except return) | Deny via proAuth |
| Public catalog queries | Exclude `isProfTestUser` |

Negative matrix for every cron producer: **not exhaustively run** in this turn; unreachable routes for test JWT are blocked at auth boundary.
