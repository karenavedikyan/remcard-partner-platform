# PROF-H4 — reuse map (branches: address, contacts, schedule, publication)

Base: navigator `7d2879fa`, platform `6d230ab`. Branch: `feat/prof-h-profile-redesign`.

## 1. PROF UI (platform)

| Concern | Reuse / extend |
|---------|----------------|
| Section shell H1–H3 | `ProfileEditor.tsx` → tab «Филиалы», `ProfileBranchesSection.tsx` |
| Branch list + add | `ProfileBranchesSection.tsx` → `GET /api/pro/organization` |
| Branch editor | `ProfileBranchDetail.tsx` (H4 expands) |
| Address geocode | `BranchAddressGeocoder.tsx` + `yandex-address-geocoder.ts` / `geohash.ts` — **same contract as** navigator `AddressGeocoder.tsx` (client Yandex `ymaps.geocode`, explicit confirm, geohash5) |
| Catalog lifecycle UX | Mirror `ProfileCatalogSection.tsx` (save draft, submit, discard, unpublish, preview) |
| Taxonomy | `ProfileDirectionsPicker.tsx`, `GET /api/pro/partner-taxonomy` |
| Save helpers | `profile-branch-save.ts` (`null` vs `undefined` for geohash clear) |
| Visual system | `ProfileEditor.module.css`, `Panel`, `Button`, `StatusBadge` |

## 2. Data model (navigator / Prisma)

| Entity | Fields (branch-scoped) |
|--------|-------------------------|
| `Branch` | `name`, `city`, `address`, `addressCity`, `addressGeohash`, `description`, `photoUrl`, `workingHours` (TEXT), `specializations[]`, `storeCategories[]`, `catalogStatus`, `catalogPublished`, `catalogDraft`, `catalogUnderReview`, `isActive` |
| `BranchPublicContact` | `type`, `value`, `label`, `isPublic`, `isActive`, `sortOrder` — unique `(branchId, type)` |
| `Organization` | Parent; org `publicContacts` for **copy** only (not live fallback on branch) |
| Owner `User` | `storeWorkingHours` — optional source for «скопировать расписание организации» |

No second branch model. No User owner contacts bleed into branch.

## 3. API routes (navigator → BFF `/api/remcard/...`)

| Action | Route |
|--------|--------|
| List org + branches | `GET /api/pro/organization` |
| Create branch | `POST /api/pro/organization/branches` |
| Branch detail | `GET /api/pro/organization/branches/[id]` (includes `publicContacts`, `isOwner`) |
| Working + catalog patch | `PATCH /api/pro/organization/branches/[id]` — поля + optional `channels` (atomic draft); published → `catalogDraft` only |
| Branch public contacts | `PATCH .../public-contacts` — live или draft; **409** if `PENDING` |
| Geocode | **No server PRO resolve route** — removed stub `POST /api/pro/geocode/resolve`; BFF allowlist does **not** include it; geodata from client Yandex + `encodeGeohash5` |
| Submit branch | `POST /api/pro/organization/branches/[id]/submit-for-moderation` (**owner only**) |
| Discard / unpublish | `PATCH` body `{ action: 'discardCatalogDraft' \| 'unpublishFromCatalog' }` |
| Approve (tests / E2E) | `POST /api/admin/moderation/branches/[branchId]/approve` |
| Public branch card | `GET /api/catalog/branch/[id]` (requires org + branch `catalogPublished`) |
| Catalog search | `GET /api/catalog?city=…&storeCategories=…` → `branches[].branchId` |

Access: `assertBranchManagerOrOwner` — owner, branch `managerId`, or `BranchEmployee` MANAGER.

Staging: `shouldStageBranchCatalogEdits` when `catalogPublished` — snapshot includes location, hours, contacts JSON.

Submit validation: `branchCatalogSubmitMissingFields` — name, city, address, geohash, ≥1 category.

## 4. Browser acceptance (H4)

| Script | Notes |
|--------|--------|
| `scripts/prof-h4-browser-acceptance.mjs` | Playwright 1440/390; **mock `window.ymaps`** in page; real PROF UI + BFF + navigator API; staff approve via `mint-staff-operator-token.ts`; loopback Basic Auth on direct navigator `fetch` |
| Fixtures | `scripts/prof-h3-browser-fixtures.ts` — org `catalogPublished: true` for public branch/search |
| Revise note seed | `scripts/prof-h4-branch-revise-seed.ts` — `NEEDS_REVISION` + `ModerationNote` with `branchId` in comment |

Screenshots: `/opt/cursor/artifacts/screenshots/prof-h4-e2e-after-approve-1440.png`, `prof-h4-e2e-390.png`.

## 5. Tests

| Suite | Purpose |
|-------|---------|
| `profH4Branches.integration.test.ts` | Lifecycle, search, ACL, hours 4xx, **PATCH null addressGeohash** |
| `profile-branch-save.test.ts`, `yandex-address-geocoder.test.ts` | Platform save body + query builder |
| `remcard-proxy.test.ts` | `POST /api/pro/geocode/resolve` → **not** allowlisted |

## 6. Out of scope

- H5 staff matrix UI / invites
- Production DB / PR / deploy
