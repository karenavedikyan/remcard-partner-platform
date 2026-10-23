# STORE-COMPANY-TEST-WORKING-PROFILE-SAVE-01

## Branches and SHAs

| Repo | Branch | Base (requested) | Tip commit |
|------|--------|------------------|------------|
| remcard-navigator | `fix/store-company-test-working-profile-save-01` | `cadb77e5d1834a6c45f778e49e9f23469eb62b46` | **`780f2cdb`** |
| remcard-partner-platform | `fix/store-company-test-working-profile-save-01` | `6a70eb1bdce37ddda86f4004ecc725a40807a5d2` | **`22d7a4be`** |

No merge, PR, release, env/config, SQL, or production writes (per task scope).

## Problem

Prof-test sessions could **GET** `/api/pro/organization`, but **POST/PATCH** were not on `profTestRoutePolicy`, so `enforceProfTestPrincipalAccess` failed closed and the client saw a generic **401** during `persistWorkingProfileDraft` → `persistOrganizationFromDraft` on wizard step 1.

## Backend change (navigator)

1. **`profTestRoutePolicy`**: allow **GET, POST, PATCH** only on exact path `^/api/pro/organization$` (subroutes such as branches/moderation stay denied).
2. **`profTestOrganizationWorkingProfile`**: guard module — eligibility (prof-test user + STORE/COMPANY), body allowlist (`name`, `partnerType`, `website`, `telegram` only), reject `action` and unknown keys with **403** + `PROF_TEST_ORG_WRITE_FORBIDDEN`, enforce owner via `getOrganizationForOwner`, block writes to orgs with INN or `catalogPublished`, force create `catalogStatus: DRAFT` and `catalogPublished: false`.
3. **`/api/pro/organization` POST/PATCH**: early branch when `resolveProfTestContext` is set; normal partner path unchanged. `website` on org columns; `telegram` via existing public-contact sync (same as production catalog contact path), not a nonexistent org column.

## Frontend change (partner-platform)

No production code changes. Added **`profile-working-save.prof-test-org.test.ts`** (vitest include) exercising real `persistWorkingProfileDraft` with mocked `remcardFetch`: STORE POST create, COMPANY PATCH update, 403 surfaced (not treated as auth loss).

## Tests run

**Navigator**

```bash
pnpm exec vitest run \
  src/lib/__tests__/profTestOrganizationWorkingProfile.test.ts \
  src/lib/__tests__/profTestRoutePolicy.test.ts \
  src/lib/__tests__/profTestSessionValidator.test.ts \
  src/app/api/pro/organization/__tests__/route.prof-test-organization-write.test.ts
```

Coverage highlights: allowlist/403, STORE/COMPANY create, MASTER denied, partnerType mismatch, forbidden `inn`/`action`, published/INN org PATCH denied, route policy blocks branch/moderation subpaths, session validator allows POST/PATCH with valid delegation.

**Partner-platform**

```bash
pnpm exec vitest run src/lib/profile-working-save.prof-test-org.test.ts
```

## Build

```bash
# remcard-navigator
pnpm run build   # OK

# remcard-partner-platform
pnpm run build   # OK
```

## Diff summary

- **Navigator**: +576 / −4 lines across 7 files (new guard module + route branch + tests).
- **Partner-platform**: +259 lines (tests + vitest include only).

## Remaining limits / not in this fix

- No end-to-end browser run of all four wizard steps; save chain covered via handler + `persistWorkingProfileDraft` unit tests only.
- Expired/revoked/disabled delegation: policy/session layer returns **null session → 401** at auth (existing prof-test behavior); handler-level **403** when delegation is valid but operation forbidden (wrong role, fields, org class).
- No change to catalog listing queries; test orgs stay off the public catalog by **never setting `catalogPublished`** and rejecting writes to published/INN orgs — not a separate catalog-index assertion in this patch.
- `telegram` on org API is contact sync, not an Organization scalar (matches main PATCH semantics).
- Full-repo `pnpm run typecheck` on navigator reports pre-existing errors unrelated to this branch; **`pnpm run build` succeeds**.
