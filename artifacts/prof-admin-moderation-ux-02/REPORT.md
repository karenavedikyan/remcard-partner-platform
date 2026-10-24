# PROF-ADMIN-MODERATION-UX-02 — org detail package (NOT full UX-02 release)

Final independent review follow-up on `fix/prof-admin-moderation-ux-02`. **Organization moderation detail** gates addressed on tips below. **Full UX-02** remains **BLOCKED** (partner detail + queue parity, dark-theme browser matrix, live test opt-in toggle cycle in browser).

## Git SHAs (`git rev-parse HEAD` only)

| Role | Repository | SHA |
|------|------------|-----|
| **Runtime frontend (built + browser gate)** | remcard-partner-platform | `95048687a2d1bc849ac3fd7f3bfab32856bf50a0` |
| **Runtime backend (public-preview + projection)** | remcard-navigator | `1b6a5f4151b80a09ffad6267f2de670598282764` |
| **Evidence REPORT tip** | remcard-partner-platform | `git rev-parse HEAD` on branch (REPORT/artifacts only vs runtime `95048687…`) |
| **Prior frontend runtime (review 2026-10-24)** | remcard-partner-platform | `22ff4eed8e13f3cdb58c1c1bd0c7988dc1a9e925` |
| **Prior backend runtime (review 2026-10-24)** | remcard-navigator | `a221e530faed8c76bff2ae34f77e7f16c4357f27` |
| **Mutation/security baseline** | remcard-navigator | `0255c94a96f68c3b102662c677b44846be9636ae` |

Backend delta from `0255c94a`: read-only `GET /api/pro/admin/moderation/organizations/[id]/public-preview`, contact projection helper, revision validation (409), `Cache-Control: private, no-store` on preview and moderation auth denials.

## Review blockers — closure

| Finding | Resolution |
|---------|------------|
| Preview mixed live org contacts with submitted scalar fields | `projectOrgPublicContactsForModerationPreview` mirrors `syncOrgCatalogPublicContactsFromDraft` (overlay/clear phone/email/telegram; keep extra channels e.g. vk). |
| Branch preview used live phone/email under review | Pending branches use `catalogUnderReview.publicContacts` when present (`branchSubmittedContacts`). DRAFT branches excluded from preview list. |
| No revision binding | Client sends `orgRevision` + `branchRevisions`; server validates (`stale_revision` → 409); response includes `organizationRevisionToken` + `branchRevisions`; modal aborts in-flight fetch; client 409/token mismatch message. |
| Readiness counted non-DRAFT only | `moderationOrgActiveBranchCount` = active branches (matches submit `isActive: true`); PENDING org + DRAFT branch → no false “add branch” required; draft-only → recommendation not requirement. |
| Wrong backend SHA in prior REPORT | Prior typo `a221e53ddab5…` invalid; authoritative `a221e530faed8c76bff2ae34f77e7f16c4357f27` at review; new tip `1b6a5f41…`. |
| Missing backend tests for new route | Unit: `orgCatalogPublicContacts.preview.test.ts` (2). PG integration: `profAdminModerationPublicPreview.integration.test.ts` (6) with `PROF_TEST_CATALOG_INTEGRATION_OK=1`. |
| Frontend did not test public-preview | `prof-admin-moderation-public-preview.test.ts` (revision query + 409). Modal wired to API with `cache: no-store` via `remcardFetch`. |
| Focus trap | `useModerationModalFocusTrap` on confirm + full preview modals; dialog focus typing tests pass. |

## Residual BLOCKED (honest gates)

| Gate | Status |
|------|--------|
| `/admin/moderation/partners/[id]` UX-02 parity | **BLOCKED** |
| Moderation queue list UX-02 | **BLOCKED** |
| Dark theme screenshots (org detail) | **BLOCKED** (not in gate script) |
| Browser proof of test opt-in allow/hide toggle | **BLOCKED** (UI block covered in component tests only) |
| Full `npm run test:component` | **BLOCKED** unrelated failures (`ProfileEditor`, `profile-overview-display`) |

## Commands / exit codes (2026-10-24, agent VM)

```bash
# remcard-navigator
pnpm exec vitest run src/lib/__tests__/orgCatalogPublicContacts.preview.test.ts
# 2 passed, 1 file, exit 0

PROF_TEST_CATALOG_INTEGRATION_OK=1 pnpm exec vitest run \
  src/lib/__tests__/profAdminModerationPublicPreview.integration.test.ts
# 6 passed, 1 file, exit 0

pnpm exec tsc --noEmit 2>&1 | rg 'profAdminModerationPublicPreview|orgCatalogPublicContacts|public-preview/route|profAdminModerationGuard' || true
# no errors in changed files (repo-wide tsc has pre-existing failures elsewhere)

# remcard-partner-platform
npx vitest run \
  src/lib/prof-admin-moderation-public-preview.test.ts \
  src/lib/prof-admin-moderation-org-readiness.test.ts \
  src/lib/prof-admin-moderation-org-display.test.ts \
  src/lib/prof-admin-moderation-org-actions.test.ts \
  src/lib/remcard-proxy-moderation.test.ts \
  src/lib/branch-catalog-preview.test.ts \
  src/app/admin/moderation/organizations/\[id\]/OrganizationModerationDetail.actions.test.tsx \
  src/app/admin/moderation/organizations/\[id\]/ModerationConfirmDialog.test.tsx
# 31 passed, 8 files, exit 0

npx tsx --test src/lib/category-display.test.ts
# 10 passed, exit 0

npm run test:proxy
# 283 passed, exit 0

npx tsc --noEmit
# exit 0

bash scripts/prof-admin-moderation-ux-02/run-browser-gate.sh
# exit 0 — artifacts/prof-admin-moderation-ux-02/browser-gate.log
```

## Browser matrix (isolated PG, post-tip `95048687` / `1b6a5f41`)

| Scenario | Result |
|----------|--------|
| Org detail 1440/390 | PASS |
| Preview list (`catalog-public-preview`) | PASS |
| Preview full (`moderation-catalog-full-preview` + revision query) | PASS |
| Org revise / reject dialogs + POST | PASS |
| Org approve, queue 1440/390 | PASS |
| Branch reject dialog | PASS |
| Partner approve/revise/reject (legacy partner UI) | PASS |

Screenshots: `artifacts/prof-admin-moderation-ux-02/screenshots/passed/` (incl. `org-preview-full-1440.png`, `org-preview-dialog-390.png`, `org-revise-dialog-1440.png`).

## Production

No deploy, SQL, env, or real-application mutations.

## Rollback

- Org detail frontend only: `93942eeb10e965aed7a84add014d50476d3380ef`.
- Backend without public-preview: `0255c94a96f68c3b102662c677b44846be9636ae`.
