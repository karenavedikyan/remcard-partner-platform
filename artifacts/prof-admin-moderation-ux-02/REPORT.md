# PROF-ADMIN-MODERATION-UX-02 — BLOCKED (not release)

Branch `fix/prof-admin-moderation-ux-02`. **Organization detail** regression fixes landed; **full original UX-02** (partner detail, queue, dark browser matrix, test opt-in browser cycle) **still open** — see [Remaining UX-02 scope](#remaining-ux-02-scope).

## Git SHAs (`git rev-parse`)

| Role | Repository | SHA |
|------|------------|-----|
| **Frontend runtime (app code)** | remcard-partner-platform | `f0c0bf95f50484e579dc50e2fc642f51d2a776b7` |
| **Backend runtime (public-preview)** | remcard-navigator | `031066e5` — run `git rev-parse HEAD` on branch for full 40 hex |
| **Prior review runtime pair** | partner / navigator | `95048687…` / `1b6a5f41…` |

Evidence artifacts (screenshots/logs) from earlier gate remain under `088a1ff0…`; re-run gate after this runtime tip before claiming browser green.

## Second independent review — fixed regressions

| Defect | Fix | Regression tests |
|--------|-----|------------------|
| Full preview fetch loop (4× calls) | `moderationOrgPreviewRevisionFetchKey` + effect deps on primitive key; inline async load (no unstable `useCallback` + `revisionQuery` object) | `ModerationPreviewModal.test.tsx` (4): mount=1 fetch, same revision rerender=0, revision change=1, abort/late response |
| Omitted snapshot key dropped live managed contact | Projection starts from all live public rows; applies only keys **present** in `catalogUnderReview` (omit=preserve, explicit empty=delete) | `orgCatalogPublicContacts.preview.test.ts` (+2): description-only preserves email; partial snapshot preserves phone |

## Org detail (prior tranche)

Readiness active branches, revision binding, branch submitted contacts, focus trap, targeted vitest/proxy — see git history `95048687…` → `f0c0bf95…`.

## Remaining UX-02 scope (implementation debt, not env blockers)

| Item | Status |
|------|--------|
| Partner detail: `ModerationConfirmDialog`, 409/revision, tokens/CSS parity with org | **Not started this tip** |
| Queue list: shared moderation layout/tokens, mobile table | **Not started this tip** |
| Dark theme browser screenshots | **Not run** |
| Browser test opt-in allow/hide on org UI | **Not run** (org component test covers block visibility) |
| Full `test:component` | Pre-existing failures outside package; use targeted set below |

## Commands / exit codes (2026-10-24)

```bash
# remcard-navigator @ 031066e5
pnpm exec vitest run src/lib/__tests__/orgCatalogPublicContacts.preview.test.ts
# 4 passed, exit 0

PROF_TEST_CATALOG_INTEGRATION_OK=1 pnpm exec vitest run \
  src/lib/__tests__/profAdminModerationPublicPreview.integration.test.ts
# 6 passed, exit 0 (when DATABASE_URL set)

# remcard-partner-platform @ f0c0bf95
npx vitest run \
  src/lib/prof-admin-moderation-public-preview.test.ts \
  src/lib/prof-admin-moderation-org-readiness.test.ts \
  src/lib/prof-admin-moderation-org-display.test.ts \
  src/lib/prof-admin-moderation-org-actions.test.ts \
  src/lib/remcard-proxy-moderation.test.ts \
  src/lib/branch-catalog-preview.test.ts \
  src/app/admin/moderation/organizations/[id]/OrganizationModerationDetail.actions.test.tsx \
  src/app/admin/moderation/organizations/[id]/ModerationConfirmDialog.test.tsx \
  src/app/admin/moderation/organizations/[id]/ModerationPreviewModal.test.tsx
# 36 passed, 9 files, exit 0

npx tsc --noEmit
# exit 0

npm run test:proxy
# 283 passed, exit 0
```

Backend **full** `pnpm run typecheck`: repo-wide baseline has pre-existing errors; changed files only were clean at `1b6a5f41` — re-verify after `031066e5` with `pnpm exec tsc --noEmit 2>&1 | rg orgCatalogPublicContacts` (expect no matches).

## Production

No deploy, SQL, env, or live moderation actions.
