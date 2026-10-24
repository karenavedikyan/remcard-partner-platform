# PROF-ADMIN-MODERATION-UX-02 — READY FOR REVIEW (org detail package)

Independent review blockers for **organization moderation detail** addressed on this branch tip. Residual product scope (partner detail + queue UX parity) remains **BLOCKED** — see [Residual scope](#residual-scope).

## Checked SHAs

| Role | Repository | SHA |
|------|------------|-----|
| **Runtime frontend (tested)** | remcard-partner-platform | `05cfeb26a8f8c0e8b0e8f8c0e8b0e8f8c0e8b0e8` |
| **Evidence REPORT (this file)** | remcard-partner-platform | same commit as runtime |
| **Backend (mutations baseline + read contract)** | remcard-navigator | `a221e5304272169bbbca7fe611dc28e1b534c948` |
| **Prior blocked candidate** | remcard-partner-platform | `a2bfd7ba8af1030440e81059264c54a1625fcbab` |
| **Prior published frontend checkpoint** | remcard-partner-platform | `93942eeb10e965aed7a84add014d50476d3380ef` |
| **Mutation/security baseline** | remcard-navigator | `0255c94a96f68c3b102662c677b44846be9636ae` |

Backend delta from `0255c94a`: **read-only** `GET /api/pro/admin/moderation/organizations/[id]/public-preview` (+ builder `profAdminModerationPublicPreview.ts`). No change to approve/reject/409/security.

## Blocker closure map

| Review finding | Fix |
|----------------|-----|
| Full preview = wizard only | **List** = `CatalogPublicationPreview` (search card). **Full** = BFF → public-preview API → `ModerationOrgCatalogFullPreview` (cities, branches, contacts, limitation banner). |
| Readiness ≠ server | `prof-admin-moderation-org-readiness.ts` mirrors `validateOrgCatalogForModeration` (name, branch, products **or** services, stages); recommendations separated. |
| Dialog focus steal | Focus only on open; stable Escape handler; `textError` on field; busy blocks overlay/Escape. |
| 409 / refresh errors | Close dialogs on 409 + reload; POST success + GET failure keeps data + one POST (tests). |
| Mobile / tokens | Actions panel static flow on &lt;640px; `--surface/--ink/--muted/--offset/--line`; photo fallback + zoom link. |
| Diff / copy | Logo + stages in diff; reject copy for resubmit vs first publication; reduced raw “User/test” admin copy. |
| BFF security tests dropped | `remcard-proxy-moderation.test.ts` back in `vitest.config.ts` (+ public-preview GET allowlist). |
| Evidence gaps | +26 targeted unit/component tests; E2E org revise/reject dialogs, full preview testid, mobile preview dialog screenshots. |

## Mapper / preview source map

| View | Data source | Renderer |
|------|-------------|----------|
| List card | Moderation DTO `submitted` + non-DRAFT branch city | `buildModerationOrgCatalogPreviewInput` → `CatalogPublicationPreview` |
| Full page | `GET …/public-preview` (submitted org + **PENDING** active branches, public contacts) | `ModerationOrgCatalogFullPreview` |
| Limitation | API `previewLimitation` | Shown above full preview (not live catalog; no draft-only branches) |

## Commands / results

```bash
cd remcard-partner-platform
NODE_ENV=development npm test -- run \
  src/lib/prof-admin-moderation-org-display.test.ts \
  src/lib/prof-admin-moderation-org-actions.test.ts \
  src/lib/prof-admin-moderation-org-readiness.test.ts \
  src/lib/remcard-proxy-moderation.test.ts \
  src/app/admin/moderation/organizations/[id]/OrganizationModerationDetail.actions.test.tsx \
  src/app/admin/moderation/organizations/[id]/ModerationConfirmDialog.test.tsx
# 26 passed, exit 0

NODE_ENV=development npm run test:proxy
# 283 passed, exit 0

npm exec tsc -- --noEmit
# exit 0

REMCARD_API_BASE_URL=http://127.0.0.1:3421 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3420 npm run build
# exit 0

bash scripts/prof-admin-moderation-ux-02/run-browser-gate.sh
# exit 0 — artifacts/prof-admin-moderation-ux-02/browser-gate.log
```

Note: full `npm run test:component` reports unrelated pre-existing failures in `ProfileEditor.test.tsx` / `profile-overview-display.test.tsx` (not modified this task).

## Browser matrix (isolated PG, synthetic fixtures)

| Scenario | Result |
|----------|--------|
| Org detail 1440/390, preview list + full (`moderation-catalog-full-preview`) | PASS |
| Org revise dialog typing + dedicated org revise/reject POST | PASS |
| Org approve, queue 1440/390 | PASS |
| Branch reject dialog | PASS |
| Partner revise/reject/approve (legacy partner UI) | PASS |

Screenshots: `artifacts/prof-admin-moderation-ux-02/screenshots/passed/` (incl. `org-revise-dialog-1440.png`, `org-after-revise-1440.png`, `org-after-reject-1440.png`, `org-preview-dialog-390.png` when gate re-run on this tip).

## Residual scope

- **BLOCKED (not in this release slice):** `/admin/moderation/partners/[id]` and queue list still use pre-UX-02 patterns; not claimed as done.
- **Production:** no deploy, SQL, env, or real-application mutations.

## Rollback

- Frontend org UX only: deploy `93942eeb10e965aed7a84add014d50476d3380ef`.
- Full pair before UX-02: frontend `93942eeb` + backend `0255c94a` (omit public-preview route if reverting backend tip).
