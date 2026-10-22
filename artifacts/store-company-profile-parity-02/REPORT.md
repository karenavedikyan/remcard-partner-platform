# STORE-COMPANY-PROFILE-PARITY-02

## Branches and SHAs

| Repo | Branch | Base (production) | Tip (this work) |
|------|--------|-------------------|-----------------|
| remcard-partner-platform | `feat/store-company-profile-parity-02` | `1abf5bd8c3890418d7731865c05da05a09e556c7` | _(see git log after push)_ |
| remcard-navigator | `feat/store-company-profile-parity-02` | `3ab843c7221c60ab7e043b9063eb31e36b0da000` | _(see git log after push)_ |

**Turn88 home (not merged into profile):**

- Frontend `feat/store-company-home-prototype-01` @ `a8a39e029f268a789db7fe067f9ab19b119e4b42`
- Backend `feat/store-company-home-prototype-01` @ `e5f82753491071819327777dc1e35a1da1d2873b`

## Reused building blocks

- `BusinessWorkingProfileWizard` / `BusinessProfileSection` — overview + basics (single mount)
- `SpecialistCatalogWizard.module.css` + five-step flow — `OrganizationCatalogWizard`
- `catalogMissingForSubmit`, `persistCatalogDraftOnly`, `submitProfileForModerationReview`
- `profile-catalog-touched` (adapt-02.1 on base)
- `ProfileDirectionsPicker` with `businessTabbedPick`

## Endpoint / entity map (profile scope)

| UI | Entity | Read/write |
|----|--------|------------|
| Business overview/basics | working profile → org on save | existing PATCH working profile / org creation |
| Organization catalog (5 steps) | `organization` catalog draft | existing org catalog draft + moderation |
| Prof-test team tab | `GET /api/pro/organization`, `GET /api/pro/invites` | allowlisted GET only (navigator) |

## Changes summary

1. **Overview:** STORE/COMPANY owners see business wizard/summary only — no agent promo blocks on overview.
2. **Basics:** Same `BusinessProfileSection` instance as overview (dirty state preserved across tabs).
3. **Catalog:** Five-step `OrganizationCatalogSection` when org exists; prerequisite panel → basics when no org; no legacy 3-step / «профиль специалиста» for business owners.
4. **Backend:** Prof-test allowlist adds GET `/api/pro/organization` and GET `/api/pro/invites`.

## Verification (local)

- `npx vitest run ProfileEditor.business-catalog.test.tsx ProfileEditor.business-wizard-dirty.test.tsx` — pass
- `npm run build` (partner-platform worktree) — pass
- `vitest profTestRoutePolicy.test.ts` (navigator policy test) — run on commit machine with deps

## Remaining limits

- Full visual parity vs prototype tar (`9bc52fb`) — desktop/mobile captures pending dedicated runner pass.
- Team/branches UX for no-org SOLO_PARTNER — invites 401 fixed at policy layer; deeper team copy not expanded.
- Nine known frontend suite failures baseline unchanged (not re-baselined this turn).
