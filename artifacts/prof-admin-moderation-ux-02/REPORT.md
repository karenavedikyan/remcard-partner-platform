# PROF-ADMIN-MODERATION-UX-02 — READY FOR REVIEW (full scope)

Branches: `fix/prof-admin-moderation-ux-02` on **remcard-partner-platform** and **remcard-navigator**. Isolated loopback QA only; no production deploy/SQL/env.

## Git SHA (`git rev-parse HEAD`)

| Role | Repository | SHA |
|------|------------|-----|
| **Frontend runtime** | remcard-partner-platform | `8b417145ce7c78761e1b86fc833bd28794559da3` |
| **Backend runtime** | remcard-navigator | `5a2c2a7d9d5c03f2b948626dea2a987daa0422a4` |
| **Evidence tip (REPORT + browser log + screenshots)** | remcard-partner-platform | Relative artifacts in this commit; exact evidence SHA in final response |

**Previous preview evidence (partner full preview gate):** `9e2b06e7fd6978478b929bcdc95c5a1a3de3e7a3` — superseded for runtime `8b417145`; retained for historical screenshots in git history.

Do **not** use branch documentation HEAD as frontend/backend runtime SHA.

Accepted regression tips (unchanged): frontend `f0c0bf95f50484e579dc50e2fc642f51d2a776b7`, backend `031066e5e71cf297e8b7533f39a5493afadc2599`.

## Gate matrix (UX-02)

| Gate | Status | Evidence |
|------|--------|----------|
| Queue + partner detail + test opt-in | **done** | prior passes; queue 390 / dark 1440 screenshots in `screenshots/passed/` |
| Partner full/list preview + PG route tests | **done** | prior tip `9e2b06e7…`; integration @ `5a2c2a7d` |
| Partner **visibility**: live snapshot vs public catalog (test opt-in) | **done** | `moderationPartnerPublicVisibility` @ `8b417145` |
| Unit: partner visibility | **done** | `prof-admin-moderation-partner-display.test.ts` — 4 passed |
| E2E: allow/hide UI assertions (`partner-catalog-public-line`, header) | **done** | `run-moderation-e2e.mjs` test opt-in block; log tail `E2E_EXIT=0` |
| Org preview + fetch-loop/contact omit | **done** | accepted tips / existing tests |

## Preview source map (partner)

| Surface | Source | Renderer |
|---------|--------|----------|
| List compact | Moderation detail `submitted.*` → `ProfileDraft` | `CatalogPublicationPreview` (specialist) |
| Full card | `GET …/partners/{id}/public-preview?partnerRevision=` | `ModerationPartnerCatalogFullPreview` |
| Public catalog visibility (admin) | live `isPublic` + status + test opt-in | `moderationPartnerPublicVisibility` |

## Commands (agent VM, exit codes)

```bash
# Frontend @ 8b417145
npx vitest run \
  src/lib/prof-admin-moderation-public-preview.test.ts \
  src/lib/remcard-proxy-moderation.test.ts \
  src/app/admin/moderation/organizations/[id]/ModerationPreviewModal.test.tsx \
  src/app/admin/moderation/organizations/[id]/OrganizationModerationDetail.actions.test.tsx \
  src/app/admin/moderation/organizations/[id]/ModerationConfirmDialog.test.tsx \
  src/lib/prof-admin-moderation-org-readiness.test.ts \
  src/lib/prof-admin-moderation-org-display.test.ts \
  src/lib/prof-admin-moderation-org-actions.test.ts \
  src/lib/prof-admin-moderation-partner-display.test.ts
# exit 0 — 39 passed (35 moderation subset + 4 partner visibility)

npx tsc --noEmit
# exit 0

# Backend @ 5a2c2a7d
pnpm exec vitest run src/lib/__tests__/profAdminModerationPartnerPublicPreview.test.ts
# exit 0 — 1 passed

PROF_TEST_CATALOG_INTEGRATION_OK=1 pnpm exec vitest run \
  src/lib/__tests__/profAdminModerationPartnerPublicPreview.integration.test.ts
# exit 0 — 5 passed

pnpm exec tsc --noEmit
# exit 1 — 52 errors repo-wide baseline (pre-existing); 0 new in UX-02 partner preview paths

# Browser @ pinned runtime SHAs (loopback PG :55432, :3421 / :3420)
# See browser-gate.log section: FE=8b417145… BE=5a2c2a7d…
cd remcard-navigator && bash scripts/prof-admin-moderation-isolated/start-frontend.sh
pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-moderation-fixtures.ts
cd remcard-partner-platform && \
  PROF_E2E_URL=http://127.0.0.1:3420 NAV_E2E_URL=http://127.0.0.1:3421 \
  PROF_MOD_E2E_ARTIFACTS=$PWD/artifacts/prof-admin-moderation-ux-02/screenshots \
  node scripts/prof-admin-moderation-isolated/run-moderation-e2e.mjs
# exit 0 — [moderation-e2e] OK (includes visibility allow/hide assertions)
```

## Production

No deploy, migrations, env, or live moderation actions.
