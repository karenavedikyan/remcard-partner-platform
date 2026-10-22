# STORE-COMPANY-PROFILE-ADAPT-01.3

## Branches / SHAs

| Repo | Base | Tip (after 01.3) |
|------|------|------------------|
| remcard-partner-platform | `09f189fcc8d1f608dd1cb66876a895f3236ed8ba` | _(see git log)_ |
| remcard-navigator | `3ab843c7221c60ab7e043b9063eb31e36b0da000` | **unchanged (freeze)** |

## Functional changes

- **Dirty guard:** `BusinessWorkingProfileWizard` reports `onBasicsDirtyChange` (full working draft vs saved snapshot, incl. org/site/TG). `ProfileEditor` uses it for `hasUnsavedBasicsChanges` when business wizard is active → `window.confirm` on section change.
- **Identity reset:** `externalBusinessProfileIdentityShift` clears wizard on user/org replacement; first org creation (null → id) is not a shift; `persistGenerationRef` drops stale saves.
- **Same-user refresh:** profile prop refresh while editing keeps local draft (sync effect no longer depends on `editing` toggle).

## Tests added

- `wizard-identity.test.ts` — shift rules
- `BusinessWorkingProfileWizard.identity.test.tsx` — reset, same-user draft, stale persist
- `ProfileEditor.business-wizard-dirty.test.tsx` — catalog tab confirm with unsaved rep name

## Visual (dev-fixture)

- Shared chrome: `PageHeading` + app layout (Manrope via root layout).
- Open editor: `?section=basics&wizard=1` (and `wizardStep=0..3` for steps 1–4 panels). Panels verified via `data-testid` before screenshot.
- Artifacts: `artifacts/store-company-profile-adapt-01-3/visual/{store|company}-step-{1-4}-{1440|375|320}.png`
- Synthetic local page only; no production accounts/data.

## Not verified

- Live authenticated `/profile` in browser (edit button automation on static fixture was flaky in Playwright; covered by RTL tests).
- Full frontend suite (still 439 pass / 9 fail, pre-existing on `90413eb`).
- Backend / deploy / merge / release.
