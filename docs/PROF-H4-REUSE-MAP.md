# PROF-H4 — reuse map (branches: address, contacts, schedule, publication)

Base: navigator `cba0a4b2`, platform `8c8f25e`. HEAD: navigator `7d2879fa`, platform `db46c7c`. Branch: `feat/prof-h-profile-redesign`.

## 1. PROF UI (platform)

| Concern | Reuse / extend |
|---------|----------------|
| Section shell H1–H3 | `ProfileEditor.tsx` → tab «Филиалы», `ProfileBranchesSection.tsx` |
| Branch list + add | `ProfileBranchesSection.tsx` → `GET /api/pro/organization` |
| Branch editor | `ProfileBranchDetail.tsx` (H4 expands) |
| Catalog lifecycle UX | Mirror `ProfileCatalogSection.tsx` (save draft, submit, discard, unpublish, preview) |
| Taxonomy | `ProfileDirectionsPicker.tsx`, `GET /api/pro/partner-taxonomy` |
| Save helpers | `profile-branch-save.ts` |
| Visual system | `ProfileEditor.module.css`, `Panel`, `Button`, `StatusBadge` |

## 2. Data model (navigator / Prisma)

| Entity | Fields (branch-scoped) |
|--------|-------------------------|
| `Branch` | `name`, `city`, `address`, `addressCity`, `addressGeohash`, `description`, `photoUrl`, `workingHours` (TEXT), `specializations[]`, `storeCategories[]`, `catalogStatus`, `catalogPublished`, `catalogDraft`, `catalogUnderReview`, `isActive` |
| `BranchPublicContact` | `type`, `value`, `label`, `isPublic`, `isActive`, `sortOrder` — unique `(branchId, type)` |
| `Organization` | Parent; org `publicContacts` for **copy** only (not live fallback on branch) |
| Owner `User` | `storeWorkingHours` — optional source for «скопировать расписание организации» (публичный профиль магазина) |

No second branch model. No User owner contacts bleed into branch.

## 3. API routes (navigator → BFF `/api/remcard/...`)

| Action | Route |
|--------|--------|
| List org + branches | `GET /api/pro/organization` |
| Create branch | `POST /api/pro/organization/branches` |
| Branch detail | `GET /api/pro/organization/branches/[id]` (includes `publicContacts`, `isOwner`) |
| Working + catalog patch | `PATCH /api/pro/organization/branches/[id]` — поля + optional `channels` (atomic draft); published → `catalogDraft` only |
| Branch public contacts | `PATCH .../public-contacts` — live или draft; **409** if `PENDING` |
| Geocode (PRO) | `POST /api/pro/geocode/resolve` — deterministic when `REMCARD_GEOCODE_DETERMINISTIC=1` |
| Submit branch | `POST /api/pro/organization/branches/[id]/submit-for-moderation` (**owner only**) |
| Discard / unpublish | `PATCH` body `{ action: 'discardCatalogDraft' \| 'unpublishFromCatalog' }` |
| Approve (tests) | `POST /api/admin/moderation/branches/[branchId]/approve` |
| Revise (tests) | admin moderation branch revise routes |

Access: `assertBranchManagerOrOwner` (`proOrganizationAccess.ts`) — owner, branch `managerId`, or `BranchEmployee` with role `MANAGER`. Other employees → **403**.

Staging: `shouldStageBranchCatalogEdits` when `catalogPublished` — snapshot includes location, hours, contacts JSON (`branchCatalogPublicContacts.ts`, `catalogPublicationLifecycle.ts`, `branchEditorEffective.ts`).

Submit validation: `branchCatalogSubmitMissingFields` — name, city, address, geohash, ≥1 category.

## 4. Public surface (remcard.ru)

| Layer | Path |
|-------|------|
| Org card locations | `buildPublicPartnerProfile` → `publicLocations[]` (published + active branches) |
| Partner page | `app/partner/[id]/page.tsx` — address, `workingHours`, branch contacts |
| Catalog search | `GET /api/catalog` — `city` + `storeCategories` filters branch rows (`mapBranchToCatalog`); requires `city` param for branch block |
| Branch public API | `GET /api/catalog/branch/[id]` |

Not changed: H2 `GET /api/partnership/search` (internal opt-in).

## 5. Schedule format

Single column `Branch.workingHours` (TEXT). H4 UI edits a weekday grid and **serializes** to human-readable Russian lines (same string shown on remcard.ru). Unparseable legacy text is shown as-is with explicit replace flow — no silent overwrite.

Server: `validateBranchWorkingHours` (`branchWorkingHours.ts`) — 4xx on invalid time tokens, not 500.

## 6. Contacts copy semantics

- Source: `OrganizationPublicContact` (+ legacy org columns only if exposed on `GET /api/pro/organization`).
- Target: `BranchPublicContact` via dedicated PATCH after user confirms selection.
- Copy is snapshot; later org edits do not update branch.
- Clear channel → delete row; no org fallback on public reads (`publicPartnerProfile` already uses branch rows only).

## 7. Tests (H4)

| Suite | Purpose |
|-------|---------|
| `profH4Branches.integration.test.ts` | Two branches, copy isolation, lifecycle, search, ACL, hours 4xx |
| `branchWorkingHours.test.ts` | Time validation |
| Platform component tests | Schedule serialize, contacts copy UI state |
| `scripts/prof-h4-browser-smoke.mjs` | 1440/390 form flows |

## 8. Out of scope

- H5 staff matrix UI / invites
- New search engine
- Production DB / PR / deploy
