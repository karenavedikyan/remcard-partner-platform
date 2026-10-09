# PROF-H3 — reuse map (catalog publication)

Base: navigator `0a1b483e`, platform `e3c9af7`. Branch: `feat/prof-h-profile-redesign`.

## 1. UI composition

| Concern | Reuse |
|---------|--------|
| Section shell / tabs H1 | `ProfileEditor.tsx`, `profile-sections.ts`, `ProfileOverviewSection.tsx` (CTA «Подготовить публикацию») |
| Catalog block (H3 target) | Extend `ProfileCatalogSection.tsx` → full «Каталог RemCard» content; remove duplicate panels from `ProfileEditor` catalog tab |
| Working vs catalog split | `profile-working-save.ts` (working PATCH), `profile-save.ts` → `persistCatalogDraftOnly`, `submitProfileForModerationReview`, `discardCatalogDraft`, `unpublishFromCatalog` |
| `catalogEntity` | `profile-catalog-state.ts` → `catalogEntityForProfile`; navigator `GET /api/pro/profile` → `catalogPublication.catalogEntity` (`user` vs `organization` for STORE/COMPANY owner) |
| Taxonomy pickers | `ProfileDirectionsPicker.tsx`, `fetchPartnerTaxonomy` / `GET /api/pro/partner-taxonomy` |
| Moderation notes | `GET /api/pro/moderation-notes`, panel in `ProfileEditor` catalog tab |

## 2. Public card (remcard.ru)

| Layer | Path |
|-------|------|
| DTO / title / contacts | `remcard-navigator/src/lib/publicPartnerProfile.ts` (`buildPublicPartnerProfile`, `catalogPublicPartnerTitle`) |
| Public page | `remcard-navigator/src/app/partner/[id]/page.tsx` |
| Avatar + fallback | `components/catalog/PartnerProfileAvatar.tsx` → `CategoryAvatar` + `getCategoryIcon` (`CategoryIcons.tsx`) |
| Public API | `getPublicPartnerById` in `partnerPublic.ts`, `GET /api/catalog` |

Platform preview mirrors the same rules in `catalog-public-preview.ts` + `CatalogCategoryAvatar.tsx` (subset of category icons).

## 3. Upload / image

| Item | Path |
|------|------|
| POST upload | `remcard-navigator/src/app/api/upload/route.ts` (blob storage, 10MB, JPEG/PNG/WEBP/HEIC) |
| Client helper | `remcard-navigator/src/lib/clientImageUpload.ts` → platform `catalog-image-upload.ts` via BFF `/api/remcard/api/upload` |
| Solo field | `User.photoUrl` in `pickUserCatalogDraftPatch` / staged `catalogDraft` |
| Org field | `Organization.logoUrl` in `pickOrgCatalogPatch` (`orgBranchCatalogPatch.ts`) |

## 4. Draft / lifecycle

| Action | API |
|--------|-----|
| Save draft | `PATCH /api/pro/profile` or `PATCH /api/pro/organization` (staged when live) |
| Submit | `action: submitForModeration` or `POST /api/pro/organization/submit-for-moderation` |
| Discard draft | `action: discardCatalogDraft` |
| Unpublish | `action: unpublishFromCatalog` |
| Approve / revise (tests) | `src/app/api/admin/moderation/...` |
| Staging rules | `catalogPublicationDraft.ts`, `catalogPublicationLifecycle.ts`, `catalogPublicVisibility.ts` |
| Submit validation (solo) | `validateSoloProfileForModeration` (`proProfileCompleteness.ts`), `partnerProfileSubmitBlockedReason` |
| Submit validation (org) | `orgSubmitBlocked`, org submit route |

## 5. Completeness (client)

Mirror server rules in `profile-catalog-completeness.ts` (no new endpoints).

## 6. Tests to extend

| Suite | Purpose |
|-------|---------|
| `catalogPublicationRoutes.integration.test.ts` (navigator) | SOLO/org/live/discard/unpublish |
| `ProfileCatalogSection.test.tsx` / `profile-catalog-completeness.test.ts` (platform) | UI states, missing-field links |
| `scripts/prof-h3-browser-smoke.mjs` | 1440/390 catalog flows |

## 7. Out of scope (H3)

- Branch public contacts inheritance (H4)
- Staff permissions (H5)
- New taxonomy / partnership search (H2)
- 1С / import / payments UI (informational line only)
