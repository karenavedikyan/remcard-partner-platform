# PROF-F — release gate (post 3a7e48d / 6cc2858)

## HEAD

| Repo | SHA |
|------|-----|
| remcard-navigator | _(after push this turn)_ |
| remcard-partner-platform | _(after push this turn)_ |

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

**NOT VERIFIED** — PROF login gate (Telegram/MAX). Artifacts:

- `/opt/cursor/artifacts/prof-f-browser-1440-NOT-VERIFIED-login-required.png`
- `/opt/cursor/artifacts/prof-f-browser-390-NOT-VERIFIED-login-required.png`

Real bot E2E — **NOT VERIFIED**

## Commands

```bash
# navigator
pnpm exec vitest run src/lib/__tests__/catalogPublicationRoutes.integration.test.ts
pnpm exec vitest run --exclude '**/*.integration.test.ts'

# platform
npm run test
```
