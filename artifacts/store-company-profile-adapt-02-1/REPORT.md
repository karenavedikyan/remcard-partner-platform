# STORE-COMPANY-PROFILE-PRERELEASE-FIX-02.1

## Base / tip

| Repo | Base (02 delivery) | Tip (this delivery) |
|------|----------------------|------------------------|
| remcard-partner-platform | `b56350e19748e31dc5bc3ccb03b3c30500714559` | `bd9fe4feea7059a42c1560f5d2af28980f8f35d7` |
| remcard-navigator | `3ab843c7221c60ab7e043b9063eb31e36b0da000` | **unchanged (freeze)** |

## Fixes (02.1)

### Published catalog locks with new partial draft

`catalogTouchedFromProfile` for published organizations now merges `publishedOrgCatalogTouchedLocks()` with any `catalogTouched` parsed from `organization.catalogDraft`, instead of returning draft-only flags. Post-approve PATCH that creates `{}`, `{website:…}`, or `{catalogTouched:{description:true}}` no longer lets `mergeCatalogPrefill` restore working `storeCategories` or partnership phone into public fields.

Regression coverage: `profile-org-catalog-published-draft.test.ts` (three draft shapes, partial touched, intentional website draft, unpublished prefill unchanged). Existing null-draft and round-trip tests unchanged in intent.

### Prototype step 1 + directions UI (frontend only)

- Aside `journeyIntro` = store/company role note; field hints and form footnote from reference `9bc52fb` / `profile-wizard.js`
- Business directions: tabs before search; prototype-aligned tab/choice styling; «Добавить / изменить» focuses search

### Vitest include

`wizard-facts.test.ts` and `profile-org-catalog-published-draft.test.ts` registered in `vitest.config.ts`.

## Tests / build (this run)

- Targeted vitest (adapt-02 suite + published-draft): see CI log in delivery commit message / local run output
- `npm run build`: OK
- Full default vitest (`src/**/*.test.tsx` glob): **not** claimed green — known unrelated failures in `ProfileEditor.test.tsx` / `profile-overview-display.test.tsx` pre-existing to this slice

## Visual

`artifacts/store-company-profile-adapt-02-1/visual/` — **reshot** step 1, step 2, filled summary (STORE/COMPANY × 1440/375/320); **reused** step 3–4 from `store-company-profile-adapt-02` (contacts/review unchanged). Capture: port **3026**, `R06_NEXT_DIST_DIR=.next-store-company-adapt-02-1-dev`, `productCodeSha` in `asset-diagnostics.json` (no PLACEHOLDER).

## Changed source files

- `src/lib/profile-catalog-touched.ts`, `profile-catalog-touched.test.ts`, `profile-org-catalog-published-draft.test.ts`
- `src/lib/business-profile/wizard-copy.ts`, `wizard-copy.test.ts`
- `src/components/profile/business/BusinessWorkingProfileWizard.tsx`
- `src/components/profile/ProfileDirectionsPicker.tsx`, `ProfileDirectionsPicker.module.css`, `ProfileDirectionsPicker.business-tabs.test.tsx`
- `vitest.config.ts`
