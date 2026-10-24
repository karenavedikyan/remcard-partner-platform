# PROF-ADMIN-MODERATION-UX-02 — READY FOR REVIEW (full scope)

Branches: `fix/prof-admin-moderation-ux-02` on **remcard-partner-platform** and **remcard-navigator**. Isolated loopback QA only; no production deploy/SQL/env.

## Git SHA (`git rev-parse HEAD`)

| Role | Repository | SHA |
|------|------------|-----|
| **Frontend runtime** | remcard-partner-platform | `bd27f762e6053c5a8a5dfc02a9b15e21ff0b4f4a` |
| **Backend runtime** | remcard-navigator | `5a2c2a7d9d5c03f2b948626dea2a987daa0422a4` |
| **Evidence tip (REPORT + browser log + screenshots)** | remcard-partner-platform | `9411de5897f6eae4a49009e43032de4559bdbc98` |

Prior evidence-only commit on this branch (superseded by this REPORT): `1a72651d6cd205b9188af41ca149265ad8bf2db4`. Do **not** use branch documentation HEAD as runtime SHA.

Accepted regression tips (unchanged): frontend `f0c0bf95f50484e579dc50e2fc642f51d2a776b7`, backend `031066e5e71cf297e8b7533f39a5493afadc2599`.

## Gate matrix (UX-02)

| Gate | Status | Evidence |
|------|--------|----------|
| Queue + partner detail + test opt-in (prior pass) | **done** | unchanged |
| Partner **full** preview: avatar, portfolio/service images, descriptions | **done** | `ModerationPartnerCatalogFullPreview.tsx` |
| Partner **list** preview: submitted publicEmail/publicPhone (not account fallback) | **done** | `buildModerationPartnerCatalogPreviewInput` + BE detail DTO |
| Browser: partner list/full preview + `GET …/public-preview` + media assertions | **done** | `run-moderation-e2e.mjs` `runPartnerPreviewGate` |
| Partner public-preview **route/builder** PG integration (not token-only) | **done** | `profAdminModerationPartnerPublicPreview.integration.test.ts` (5) |
| Org preview + fetch-loop/contact omit regressions | **done** | prior tips / existing tests |

## Preview source map (partner)

| Surface | Source | Renderer |
|---------|--------|----------|
| List compact | Moderation detail `submitted.*` → `ProfileDraft` | `CatalogPublicationPreview` (specialist) |
| Full card | `GET …/partners/{id}/public-preview?partnerRevision=` | `ModerationPartnerCatalogFullPreview` |
| Profile header/contacts | `buildPublicPartnerProfile(submitted catalogUnderReview)` | same full component |
| Portfolio/services images | DB rows on pending user (not live draft body) | full component `SafePreviewImage` |

## Commands (agent VM)

```bash
# Frontend @ bd27f762
npx vitest run \
  src/lib/prof-admin-moderation-public-preview.test.ts \
  src/lib/remcard-proxy-moderation.test.ts \
  src/app/admin/moderation/organizations/[id]/ModerationPreviewModal.test.tsx \
  src/app/admin/moderation/organizations/[id]/OrganizationModerationDetail.actions.test.tsx \
  src/app/admin/moderation/organizations/[id]/ModerationConfirmDialog.test.tsx \
  src/lib/prof-admin-moderation-org-readiness.test.ts \
  src/lib/prof-admin-moderation-org-display.test.ts \
  src/lib/prof-admin-moderation-org-actions.test.ts
# exit 0 — 35 passed

npx tsc --noEmit
# exit 0

# Backend @ 5a2c2a7d
pnpm exec vitest run src/lib/__tests__/profAdminModerationPartnerPublicPreview.test.ts
# exit 0 — 1 passed (revision token sanity)

PROF_TEST_CATALOG_INTEGRATION_OK=1 pnpm exec vitest run \
  src/lib/__tests__/profAdminModerationPartnerPublicPreview.integration.test.ts
# exit 0 — 5 passed (route + builder snapshot, auth, 404, 409)

PROF_TEST_CATALOG_INTEGRATION_OK=1 pnpm exec vitest run \
  src/lib/__tests__/profAdminModerationPublicPreview.integration.test.ts
# exit 0 — 6 passed (org, unchanged)

# Isolated browser (loopback PG :55432, tips above)
bash scripts/prof-admin-moderation-ux-02/run-browser-gate.sh
# [moderation-e2e] OK — includes partner preview gate + partner-*-preview-* screenshots
```

## Production

No deploy, migrations, env, or live moderation actions.
