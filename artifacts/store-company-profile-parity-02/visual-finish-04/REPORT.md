# VISUAL-FINISH-04

## Frontend (commit `ab49fae`)

- Business-scoped full-width summary/catalog (`BusinessProfileSurface.module.css`).
- Catalog copy aligned with ref: «Карточка партнёра» intro, step title «Категории и этапы…», role-specific directions notice.
- Working profile: navigator note on directions step (`directionsNavigatorNote`).
- Dev-fixture: `devFixtureOrganizationBranches`, catalog branch selector without live GET; `returnTo="/profile"`.

## Capture (`/tmp/visual-finish-04-capture.mjs`)

**6 ref+impl pairs @ 1440×900 light** — all OK (`capture-run.log`).

| id | Impl gate |
|----|-----------|
| store-basics-summary | `business-profile-completed-summary` |
| store-basics-step1 | «Шаг 2 из 4» after submit |
| store-catalog-step0 | step 0 + branch select loaded |
| store-catalog-step1 | `[data-catalog-step="1"]` after «Далее» |
| company-basics-summary | COMPANY fixture summary |
| company-catalog-step0 | COMPANY catalog step 0 |

## Open (not in this drop)

- Catalog steps 2–4, preview, pending, no-org
- Viewports 375 light/dark, 320 long-values
- Scroll-state lower crops

Blockers for open items: none from control batch; extend same script with viewport loop and PENDING/`noOrg=1` profile mocks.

## Pins

- `captureCheckoutHead`: manifest at capture time
- `implRenderVerifiedBaseSha`: `969f6545326118751e7217bddb18d55faa6d9bf3`
- B frozen: `cadb77e5d1834a6c45f778e49e9f23469eb62b46`
