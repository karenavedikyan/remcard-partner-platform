# STORE-COMPANY-PROFILE-PRERELEASE-FIX-02

## Base / tip

| Repo | Base | Tip (this delivery) |
|------|------|---------------------|
| remcard-partner-platform | `ce5b1c6c6227861d1a2ccd6e0f050fc101473067` | _(see git log after push)_ |
| remcard-navigator | `3ab843c7221c60ab7e043b9063eb31e36b0da000` | **unchanged (freeze)** |

Prior artifact tips (`ce5b1c6`, `bbbf10f`) are not release tags.

## Fixes

### Post-approve catalog clear (frontend)

When `organization.catalogPublished` and `catalogDraft` is cleared on approve, `catalogTouchedFromProfile` now locks catalog prefill fields so `mergeCatalogPrefill` cannot repopulate public `storeCategories` / services from working profile. Regression: post-approve GET + reopen catalog (`profile-org-catalog-roundtrip.test.ts`).

Backend `buildOrgApproveUpdate` unchanged at `3ab843c`.

### Review + summary facts

Shared `BusinessWorkingProfileFacts` renders prototype-aligned fact rows (org, representative, contacts, optional website/Telegram/work mode/areas/contact person) and taxonomy-backed direction chips on wizard step 4 and completed summary (avatar, facts, directions, ID).

### Prototype copy / directions UI

- STORE/COMPANY step-0 footnotes from `profile-wizard.js` roles.store/company.note
- Directions step title «Чем вы занимаетесь?»; `ProfileDirectionsPicker` `businessTabbedPick` for «Товары» / «Работы и услуги» tabs

## Access / eligibility (no diff in guards)

`businessProfileWizardEligible` remains: PRO + STORE/COMPANY partner type, not pure agent, not `isOrganizationStaffEmployee` (CLIENT without own activity + employer context). Negative staff tests use **CLIENT** role; null context for own PRO owner is intentional own-scope cabinet access, not a fail-closed staff policy claim.

## Tests / builds

- Selected frontend vitest: **78 passed** (23 files), incl. post-approve clear, review facts, business tabs, lifecycle, catalog round-trip
- `npm run build` (frontend): OK
- Backend: **no code changes**; full navigator suite not re-certified here

## Visual

`artifacts/store-company-profile-adapt-02/visual/` — STORE/COMPANY steps 1–4 @ 1440/375/320 with BFF mocks (`asset-diagnostics.json`, 0 console errors). Capture: `next dev` port 3026, `R06_NEXT_DIST_DIR=.next-store-company-adapt-02-dev`.

## Changed source files

- `src/lib/profile-catalog-touched.ts`
- `src/lib/business-profile/wizard-copy.ts`, `wizard-facts.ts`
- `src/components/profile/business/BusinessWorkingProfileWizard.tsx`, `BusinessWorkingProfileFacts.tsx`
- `src/components/profile/ProfileDirectionsPicker.tsx`, `ProfileDirectionsPicker.module.css`
- Tests: `profile-catalog-touched`, `profile-org-catalog-roundtrip`, `wizard-copy`, `wizard-facts`, `eligibility`, `BusinessWorkingProfileWizard.review`, `ProfileDirectionsPicker.business-tabs`
