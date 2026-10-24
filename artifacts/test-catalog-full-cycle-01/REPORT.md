# TEST-CATALOG-FULL-CYCLE-01 (frontend)

Baseline: `6e41d066c80bcc4028d3503b5d571169404c3d24`. Branch: `fix/test-catalog-full-cycle-01`.

## This revision (review fixes)

- **`adminTestUserPublicCatalogUrl`** — SOLO links use internal `User.id` (`/partner/:id`); link only when `profTestPublicCatalogAllowed`, approved, and not blocked/disabled.
- **Create test user** — checkbox `publicCatalogShow` (default off) → POST `publicCatalogShow`.
- **`submitProfileForModerationReview`** — submit success decoupled from profile GET refresh; wizards show success + soft refresh hint on GET failure; recovery via `refreshProfile()`.
- Wizards updated: `OrganizationCatalogWizard`, `SpecialistCatalogWizard`, `ProfileCatalogSection`.

## Tests (this run)

```bash
pnpm vitest run src/lib/admin-test-users-public-link.test.ts src/lib/profile-save.submit.test.tsx
# 8 passed, exit 0

pnpm exec tsc --noEmit  # exit 0
pnpm run build          # exit 0
```

Regression suite (23+ existing tests) unchanged; toggle/lifecycle browser E2E not added.

## BLOCKED

- Browser E2E 1440/390 on isolated prof + remcard stack.
- Full wizard lifecycle UI test with live moderation (needs PG + staff session).

## SHA (fill after push)

- Runtime code SHA: _(code commit)_
- Evidence tip SHA: _(docs tip)_
