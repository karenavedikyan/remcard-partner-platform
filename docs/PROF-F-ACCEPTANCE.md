# PROF-F — release gate (post 3a7e48d / 6cc2858)

## HEAD

| Repo | SHA |
|------|-----|
| remcard-navigator | `2263af3` (build fix on `670b8c9` logic) |
| remcard-partner-platform | `c5617e3` |

Base compared to Computer release check: navigator `3a7e48d`, platform `6cc2858`.

## Release conditions (Computer)

### 1. Never-approved User must not become public without approve

**Fix:** `userPreserveIsPublicOnModerationSubmit` → only `user.isPublic` (no NEEDS_REVISION/APPROVED shortcut).

| Step | HTTP | DB / catalog |
|------|------|----------------|
| DRAFT submit | PATCH profile `submitForModeration` **200** | PENDING, `isPublic=false` |
| revise | POST admin revise **200** | NEEDS_REVISION |
| PATCH description | **200** | draft staged, live unchanged |
| resubmit | **200** | PENDING, **`isPublic=false`** |
| GET `/api/catalog?limit=100` | **200** | partner **absent** |

Vitest: `never approved stays hidden after NEEDS_REVISION resubmit` — **PASS**  
HTTP script: `neverApprovedUser: PASS` — `/opt/cursor/artifacts/prof-f-release-check-http.json`

### 2. Catalog entity routing (User vs Organization vs Branch)

**Fix:** Platform `persistCatalogDraftOnly` / unpublish / submit / discard → org endpoints when `catalogEntity=organization`. Navigator GET `/api/pro/profile` builds `catalogPublication` from org when STORE/COMPANY owner. Branch detail: catalog draft / unpublish / submit / discard via branch API.

| Check | HTTP | Result |
|-------|------|--------|
| Org catalog draft | PATCH `/api/pro/organization` `{description, storeCategories}` **200** | `Organization.catalogDraft` **set** |
| Org unpublish | PATCH org `{action:unpublishFromCatalog}` **200** | GET `/api/catalog/org/[id]` **404** |
| Published resubmit (regression) | unchanged | still **PASS** |

HTTP: `orgCatalogEntity: PASS`

### 3. SOLO team

**Fix:** `employees-overview` → `myRole: SOLO_PARTNER` via `getProContext`; proxy allowlist **GET** `/api/pro/employees`; `ProfileTeamSection` loads solo employees when `SOLO_PARTNER`.

Code + proxy test **GET /api/pro/employees** — **PASS**

## HTTP regression (real, :3401, remcard_prof_test)

```bash
cd remcard-navigator
export $(grep -v '^#' .env.local | xargs)
BASE_URL=http://127.0.0.1:3401 pnpm exec tsx scripts/prof-f-catalog-http-regression.ts
```

All: `user`, `neverApprovedUser`, `orgCatalogEntity`, `org`, `branch` → **PASS**

## PG integration

`catalogPublicationRoutes.integration.test.ts` — **8/8 PASS**

## Browser 1440 / 390

**PASS** (Computer, synthetic local session on navigator `670b8c9` + platform `c5617e3`): org/branch catalog drafts persist after reload; unpublish → public 404; branch submit keeps prior public text and locks fields; SOLO list + role PATCH/revoke; 35 BFF requests **200**; no horizontal overflow.

Real bot E2E — **NOT VERIFIED**

## Production build

| Repo | Command | Exit |
|------|---------|------|
| remcard-navigator | `NODE_ENV=production PLATFORM_INN=0000000000 PLATFORM_OGRN=000000000000000 node scripts/build-app.mjs` | **0** |
| remcard-partner-platform | production frontend build on `c5617e3` | **0** (Computer) |

Navigator: `pnpm exec prisma generate` → `pnpm typecheck` (`tsc --noEmit`) → **0**.

## Commands

```bash
# navigator
pnpm exec prisma generate
pnpm typecheck
NODE_ENV=production PLATFORM_INN=0000000000 PLATFORM_OGRN=000000000000000 pnpm build
pnpm exec vitest run src/lib/__tests__/catalogPublicationRoutes.integration.test.ts
pnpm exec vitest run --exclude '**/*.integration.test.ts'

# platform
npm run test
```
