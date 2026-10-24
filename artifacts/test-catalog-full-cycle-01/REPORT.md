# TEST-CATALOG-FULL-CYCLE-01 (frontend)

Baseline: `6e41d066c80bcc4028d3503b5d571169404c3d24`. Branch: `fix/test-catalog-full-cycle-01`.

**Runtime code SHA:** `e092ef261d538b986df45da05dbd4db592f5c656`  
**Evidence tip SHA:** _(docs commit below; runtime remains e092ef26)_

## Review fixes in runtime

- `adminTestUserPublicCatalogUrl` — `/partner/${user.id}`, gated on allow + approved + not blocked.
- Create form: `publicCatalogShow` (default false).
- `submitProfileForModerationReview` — `{ submitAccepted, profile?, refreshFailed? }`; wizards avoid false «Не удалось отправить» when submit OK.

## Tests (2026-10-24 run)

| Command | Result |
|---------|--------|
| `admin-test-users-public-link.test.ts` + `profile-save.submit.test.tsx` | **8 passed** |
| `pnpm exec tsc --noEmit` | **pass** |
| `pnpm run build` | **pass** |

## BLOCKED

- Browser E2E 1440/390 (isolated env not available in cloud agent VM).
- End-to-end UI test of admin toggle + full catalog lifecycle.
