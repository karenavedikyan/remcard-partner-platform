# PROF-ADMIN-MODERATION-UX-02 — READY FOR REVIEW

## Before / after

| Before (checkpoint UI) | After (UX-02) |
|------------------------|---------------|
| Сырые enum/IDs, «Submitted отличается от live», все textarea сразу | Карточки данных, русские labels, diff первой/повторной заявки |
| Нет catalog preview | «Посмотреть как в каталоге» — list + full через `CatalogPublicationPreview` |
| Test opt-in рядом с approve | Отдельный блок «Публикация тестового партнёра» |
| «Одобрить org + pending (0)» | Batch только при pending > 0, scoped branch dialogs |

**Routes:** `/admin/moderation` → `/admin/moderation/organizations/[id]` (query filters preserved on «← Очередь»).

## Mapper / preview source map

| Public field | Source (server) | Renderer |
|--------------|-----------------|----------|
| Title, city | `organization.submitted` + branch cities | `buildModerationOrgCatalogPreviewInput` → `buildCatalogPreviewModel` → `CatalogPublicationPreview` (business variant for STORE/COMPANY) |
| Logo | `submitted.logoUrl` | `CatalogCategoryAvatar` in preview |
| Description, contacts | `submitted.*` public fields only | same pipeline as profile wizard preview (not live, not owner account) |
| Categories / services / stages | `submitted.storeCategories/specializations/navigatorStageIds` | `displayCategoryLabel`, `masterDirectionLabel`, `ONBOARDING_STAGES` |
| Branch preview | `branch.submitted` + org category inheritance | `buildBranchPreviewModel` → `BranchCatalogPublicationPreview` (PENDING only) |

Preview uses **catalogUnderReview/submitted** snapshot from backend `buildProfOrganizationModerationDetail` — not `live`, not unpublished draft after submit.

## SHA (`git rev-parse HEAD`)

| Role | Repository | SHA |
|------|------------|-----|
| **Runtime frontend (tested)** | remcard-partner-platform | `a2bfd7ba8af1030440e81059264c54a1625fcbab` |
| **Backend (unchanged baseline)** | remcard-navigator | `0255c94a96f68c3b102662c677b44846be9636ae` |

Backend moderation mutations / 409 / security: **reuse** prior `prof-admin-catalog-moderation-01` evidence on `0255c94a` (not re-run this turn).

## Commands / results

```bash
# Unit/component (frontend)
cd remcard-partner-platform
NODE_ENV=development npm test -- run \
  src/lib/prof-admin-moderation-org-display.test.ts \
  src/lib/prof-admin-moderation-org-actions.test.ts \
  src/app/admin/moderation/organizations/[id]/OrganizationModerationDetail.actions.test.tsx
# 14 passed, exit 0

REMCARD_API_BASE_URL=http://127.0.0.1:3421 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3420 npm run build
# exit 0

npx tsc --noEmit
# exit 0 (partner)

bash scripts/prof-admin-moderation-ux-02/run-browser-gate.sh
# exit 0 — log: artifacts/prof-admin-moderation-ux-02/browser-gate.log
```

## Browser matrix

| Scenario | Result |
|----------|--------|
| Admin login → org detail 1440/390 | PASS |
| Catalog preview list + full | PASS (`org-preview-*-1440.png`) |
| Org approve via dialog | PASS |
| Queue filters / deep link | PASS (existing harness) |
| Branch reject scoped dialog | PASS |
| Partner revise/reject/approve | PASS |

Screenshots: `artifacts/prof-admin-moderation-ux-02/screenshots/passed/` (synthetic fixtures only).

## Scope

- **Migration / env:** none (frontend-only).
- **Production:** no deploy, SQL, or real-application mutations.

## Owner smoke

1. Open PROF admin → moderation queue → organization PENDING.
2. «Посмотреть как в каталоге» (list + full) — submitted version.
3. «Одобрить заявку» → confirm; for test partner check separate opt-in block.

**Rollback:** deploy frontend `93942eeb10e965aed7a84add014d50476d3380ef` (prior checkpoint pair).

## Changed files (product)

- `src/lib/prof-admin-moderation-org-display.ts` (+ tests)
- `src/lib/prof-admin-moderation-org-actions.ts` (+ tests)
- `src/app/admin/moderation/organizations/[id]/OrganizationModerationDetailClient.tsx` (+ module CSS, preview/confirm dialogs, actions test)
- `scripts/prof-admin-moderation-isolated/run-moderation-e2e.mjs` (selectors)
- `scripts/prof-admin-moderation-ux-02/run-browser-gate.sh`
