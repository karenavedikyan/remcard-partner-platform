# STORE-COMPANY-PROFILE-PRERELEASE-FIX-02.1

## Base / tip

| Repo | Base (02 delivery) | Tip (this delivery) |
|------|----------------------|------------------------|
| remcard-partner-platform | `b56350e19748e31dc5bc3ccb03b3c30500714559` | `bd9fe4feea7059a42c1560f5d2af28980f8f35d7` |
| remcard-navigator | `3ab843c7221c60ab7e043b9063eb31e36b0da000` | **unchanged (freeze)** |

## Fixes (02.1)

### Published catalog locks with new partial draft

`catalogTouchedFromProfile` for published organizations merges `publishedOrgCatalogTouchedLocks()` with `catalogTouched` from `organization.catalogDraft`, instead of draft-only flags. After approve, PATCH that creates `{}`, `{website:…}`, or `{catalogTouched:{description:true}}` no longer restores working products or partnership phone into public catalog fields.

Tests: `profile-org-catalog-published-draft.test.ts`, extended `profile-catalog-touched.test.ts`; prior null-draft / round-trip behavior preserved.

### Prototype step 1 + directions UI

Aside `journeyIntro` = store/company role note; org/rep/city hints and basics footnote per reference `9bc52fb`. Business directions: tabs before search, prototype tab/choice styling, «Добавить / изменить» → search focus.

### Vitest include

`wizard-facts.test.ts`, `profile-org-catalog-published-draft.test.ts` in `vitest.config.ts`.

## Tests / build (measured)

| Command | Result |
|---------|--------|
| Targeted vitest (21 files, adapt + catalog regressions) | **75 passed** |
| `npm run build` | **OK** |
| Full repo vitest (128 files) | **not claimed green** (10 failures in `ProfileEditor.test.tsx`, `profile-overview-display.test.tsx` — outside this slice) |

## Visual

Folder: `artifacts/store-company-profile-adapt-02-1/visual/`

- **Reshot:** `*-step-1-*`, `*-step-2-*`, `*-summary-*` (STORE/COMPANY × 1440/375/320)
- **Reused from adapt-02:** `*-step-3-*`, `*-step-4-*` (contacts / review unchanged)
- Capture: `http://127.0.0.1:3026`, `R06_NEXT_DIST_DIR=.next-store-company-adapt-02-1-dev`
- `asset-diagnostics.json`: real `productCodeSha`, 0 console errors, 0 unmocked BFF routes in capture run

## Changed source files

- `src/lib/profile-catalog-touched.ts`, `profile-catalog-touched.test.ts`, `profile-org-catalog-published-draft.test.ts`
- `src/lib/business-profile/wizard-copy.ts`, `wizard-copy.test.ts`
- `src/components/profile/business/BusinessWorkingProfileWizard.tsx`
- `src/components/profile/ProfileDirectionsPicker.tsx`, `ProfileDirectionsPicker.module.css`, `ProfileDirectionsPicker.business-tabs.test.tsx`
- `vitest.config.ts`
