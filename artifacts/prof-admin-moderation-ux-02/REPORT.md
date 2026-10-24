# PROF-ADMIN-MODERATION-UX-02 — READY FOR REVIEW (full scope)

Branches: `fix/prof-admin-moderation-ux-02` on **remcard-partner-platform** and **remcard-navigator**. Full UX-02: org + **partner** detail, **queue**, public preview contracts, accepted regressions, isolated real-stack browser gate (synthetic fixtures, loopback PG `:55432`, external notifications off). No production deploy/SQL/env.

## Git SHA (`git rev-parse HEAD`)

| Role | Repository | SHA |
|------|------------|-----|
| **Frontend runtime** | remcard-partner-platform | `d47a91a91ae2da9e6485d900e77c7f164bdae801` |
| **Backend runtime** | remcard-navigator | `fab2ccf52f926cf19f959af13157bae39e05fd1b` |
| **Evidence tip (this REPORT + gate log + screenshots)** | remcard-partner-platform | `d4f72e147b94dea79795e907ae346a0922313ca8` |

Prior accepted regression tips (do not redo): frontend `f0c0bf95f50484e579dc50e2fc642f51d2a776b7`, backend `031066e5e71cf297e8b7533f39a5493afadc2599` — fetch loop + contact omit (see `0e1f75fc` REPORT).

Feature body on frontend tip `646ca1f9eacf9b8a8cf42f4ac697009af17011c8` (partner detail, queue, BFF preview).

## Gate matrix (original UX-02)

| Gate | Status | Evidence |
|------|--------|----------|
| Org detail PROF UI, dialogs, preview revision, test panel | **done** | `OrganizationModerationDetailClient`, E2E + screenshots |
| Partner detail parity (dialogs, list/full preview, test publication, 409) | **done** | `PartnerModerationDetailClient`, `PartnerModerationPreviewModal`, E2E |
| Queue PROF UI RU labels, filters/search, mobile cards, filter query preserved | **done** | `AdminModerationClient`, `data-testid=moderation-queue-card`, E2E |
| Org public-preview + revision/no-store | **done** | navigator org route + integration tests |
| Partner public-preview + revision/no-store | **done** | `profAdminModerationPartnerPublicPreview.ts`, BFF allowlist |
| Fetch loop + contact omit regressions | **done** | accepted tips; tests still green in targeted runs |
| Light/dark 1440 + queue 390 actual browser | **done** | `artifacts/.../screenshots/passed/*-{light,dark}-1440.png`, `queue-390.png` |
| Test opt-in allow/hide + public origin HTTP | **done** | E2E `testOptInPartnerUserId`, `partner-test-opt-in-cycle-*` |
| Targeted FE vitest + proxy + tsc + production build | **done** | commands below |
| Backend unit/integration + repo tsc baseline | **done** | 52 baseline errors, 0 in new moderation preview paths |
| Full `test:component` | **baseline delta only** | not claimed green repo-wide |

## Mapper / preview source map

| View | Data | Renderer |
|------|------|----------|
| Org list preview | DTO `submitted` | `CatalogPublicationPreview` |
| Org full preview | `GET …/organizations/{id}/public-preview?revision=` | `ModerationOrgCatalogFullPreview` |
| Partner list preview | DTO `submitted` | `CatalogPublicationPreview` (specialist) |
| Partner full preview | `GET …/partners/{userId}/public-preview?revision=` | `ModerationPartnerCatalogFullPreview` |

## Commands (agent VM, exit codes)

```bash
# Frontend @ d47a91a9
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

npm run test:proxy
# exit 0 — 283 passed

npx tsc --noEmit
# exit 0

REMCARD_API_BASE_URL=http://127.0.0.1:3421 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3420 npm run build
# exit 0

# Isolated browser (after bootstrap); harness @ fab2ccf5
bash scripts/prof-admin-moderation-ux-02/run-browser-gate.sh
# E2E: [moderation-e2e] OK — exit 0 (see browser-gate.log tail)

# Backend @ fab2ccf5
pnpm exec vitest run \
  src/lib/__tests__/orgCatalogPublicContacts.preview.test.ts \
  src/lib/__tests__/profAdminModerationPartnerPublicPreview.test.ts
# exit 0 — 5 passed

PROF_TEST_CATALOG_INTEGRATION_OK=1 pnpm exec vitest run \
  src/lib/__tests__/profAdminModerationPublicPreview.integration.test.ts
# exit 0 — 6 passed

pnpm exec tsc --noEmit
# exit 1 — 52 errors repo-wide baseline (pre-existing); 0 errors on partner preview routes/lib
```

## Browser gate notes

- Stack: PG `:55432`, navigator `:3421`, partner `:3420`, `PROF_ADMIN_TEST_USERS_ENABLED=1`, synthetic seed only.
- Flow: admin login → queue (1440 light/dark, 390 mobile cards) → org revise/reject/approve + previews → partner revise/reject/approve + previews → test opt-in cycle → branch reject.
- Harness fix `fab2ccf5`: kill orphaned `next-server` via `netstat` when `lsof` misses loopback listeners (VM had stale `:3420`).

## Production

No deploy, SQL migrate, env/DNS/secrets, main push, or live moderation.
