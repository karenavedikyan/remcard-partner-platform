# STORE-COMPANY-PROFILE-ADAPT-01.4

## Branches / SHAs

| Repo | Branch | Tip |
|------|--------|-----|
| remcard-partner-platform | `feat/store-company-profile-adapt-01` | `32c09b7` |
| remcard-navigator | `feat/store-company-profile-adapt-01` | `3ab843c7221c60ab7e043b9063eb31e36b0da000` (**frozen**) |

Base frontend (01.3): `918124606e1484c0e2b2929983eaac7db1c869aa`.

## Functional change (persist lifecycle)

`BusinessWorkingProfileWizard.persistServer` now guards **success, catch, and finally** with `persistGenerationRef` + `persistRequestIdRef`:

- Identity shift / unmount bumps generation → stale handlers no-op.
- Stale `finally` does not clear `saving` for a newer in-flight request.
- Identity reset clears `saving` for the new context.

## Tests

New: `BusinessWorkingProfileWizard.persist-lifecycle.test.tsx` (3 counterexamples + overlap with newer save after identity handoff).

Selected vitest set (20 files, **67 passed**): wizard lifecycle/identity/skip/basics, business dirty guard, catalog touched, org catalog round-trip, working-profile libs, profile cabinet/sections/save/branch/staff, wizard-copy.

`npm run build` — OK.

Full `ProfileEditor.test.tsx` baseline failures not mass-fixed; full suite not claimed green.

## Changed files (01.4)

- `src/components/profile/business/BusinessWorkingProfileWizard.tsx`
- `src/components/profile/business/BusinessWorkingProfileWizard.persist-lifecycle.test.tsx`

## Visual / asset diagnostics

Capture: `next dev` on port **3024** with `R06_NEXT_DIST_DIR=.next-store-company-adapt-01-4-dev` (isolated from production `.next` build).

- PNGs: `artifacts/store-company-profile-adapt-01-4/visual/{store|company}-step-{1-4}-{1440|375|320}.png`
- Interaction (mock `/api/pro/profile`, blocked external hosts): `visual/store-interaction-edit-nav-mock-1440.png`
- Details: `ASSET-DIAGNOSTICS.md`, `asset-diagnostics.json`

Summary: `_next/static` sampled **216** responses, **0** non-200; **0** chunk 404; **no** hydration console errors. Computed: Manrope, background `rgb(246, 245, 243)`, tab gap **24px**, `document.fonts` **loaded**. Console 401s are unauthenticated fixture API probes (not static assets).
