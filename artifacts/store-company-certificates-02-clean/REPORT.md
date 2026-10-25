# STORE-COMPANY-CERTIFICATES-02-CLEAN (review remediation)

## Status

**READY FOR REVIEW** on clean branch pair `feat/store-company-certificates-02-clean`.

Full **prof-test synthetic write path** (create / issuer cancel / PDF download under delegation) is **not** claimed: `profTestRoutePolicy` keeps business-owner **mutations** and store **POST** / certificate **PDF** off the allowlist. Integration tests with `isProfTestUser: false` cover real-owner issuer rules; the browser gate proves **read** list/detail/QR plus **explicit write denials**.

Legacy branch `feat/store-company-certificates-01` remains on the remote (unchanged history; **do not release** — BE tip `73b196ae…` contains committed `.catalog-qa-isolated/` runtime).

## Runtime refs

| Role | SHA |
|------|-----|
| Backend production base | `f3baba9ca2666a569efea16d238ef8ca68e7ee2d` |
| Frontend production base | `1dcd79c2` (FE adapt base on branch) |
| **Backend tip (clean)** | `8fabfdda64398afd7cb8ba46a2b3d352201af6aa` |
| **Frontend tip (clean)** | see `shell-gate.json` `frontendRuntimeSha` after final push |

Clean BE history: `73b196ae…` is **not** an ancestor (`merge-base --is-ancestor` → false). `.catalog-qa-isolated/` is gitignored; no QA pgdata/WAL/tokens in tree.

## Review blockers (1–5)

### 1 — Packaging / security

- New branch from BE `f3baba9…` only; src/scripts/tests + `.gitignore` entry for `.catalog-qa-isolated/`.
- No cherry-pick of contaminated commit; no force-push or history rewrite on `feat/store-company-certificates-01`.

### 2 — Access (ORG owner, not “any PRO in STORE/COMPANY”)

- `assertOrgOwnerBusinessCertificatesContext` requires `proCtx.role === 'ORG_OWNER'` and org ownership alignment.
- Employees / branch staff / MASTER / CLIENT rejected in unit + integration tests.
- Frontend `/recommendations` gate is UX only; API guards are authoritative.

### 3 — Mutation ownership

- **List scope** (org-wide view) ≠ **issuer mutations**: `cancel`, `updateDiscounts`, `DELETE` require `viewerIsCertificateIssuer` (`proUserId === viewer`).
- **Archive / restore / alias** remain per-viewer workspace in list scope.
- `GET /api/store/certificate/[id]` scope change limited via `storeCertificateOwnerDetailWhere` to STORE/COMPANY **org owners** (regression in `storeCertificateOwnerDetailWhere.test.ts`).
- Discount writes reuse `applySpecialistIssuerDiscountUpdates` + `parseSpecialistDiscountUpdatesBody` (no duplicated list-scope discount helper).

### 4 — FE regression

- `issuer-api.ts` lazy dynamic imports so specialist vitest mocks are not broken at module load.
- Added `api.test.ts` (list/detail/PATCH/DELETE/batch adapter paths) + existing copy/issuer/proxy tests.
- CertificateCreateForm specialist + alias suites: **14 passed** in scoped run.

### 5 — Browser gate (isolated synthetic)

Script: `scripts/store-company-certificates-01/run-browser-gate.sh` (PG harness, NAV `:3421`, PROF `:3420`, production `next build`).

| Check | Result |
|-------|--------|
| `shell-browser-gate.exit` | `0` |
| Store/company list + eyebrow copy | pass |
| Detail dialog + `certificate-code` + QR preview | pass |
| Store certificate GET (qrCode) via proxy | pass |
| Prof-test POST store cert / PATCH archive | denied (403/400) |
| Prof-test PDF by promo/qr code | not served (403/404) |
| Master: no `business-certificates-root` | pass |
| Light/dark × 1440/390/320 screenshots | `artifacts/store-company-certificates-02-clean/visual-shell/` |
| `shell-gate.json` `failures` | `[]` |

Harness build sets `NEXT_PUBLIC_CERTIFICATE_BASE_URL=http://127.0.0.1:<PROF_PORT>` in `start-frontend.sh` so QR renders in isolated runs only.

## Tests / build (this tip)

| Suite | Result |
|-------|--------|
| navigator `businessOwnerCertificatesAccess` + `storeCertificateOwnerDetailWhere` + `profTestRoutePolicy` + `business-owner-certificates` route integration | **17 passed** (4 files) |
| partner business-owner + CertificateCreateForm + proxy scoped vitest | **24 passed** (7 files) |
| partner `npm run build` | pass (via gate frontend build) |
| navigator `tsc --noEmit` error count vs base `f3baba9` | **52 = 52** (integration test typed; no new baseline drift) |

## Reuse map (UI unchanged)

| Surface | Reuse |
|---------|--------|
| `/recommendations` | `AgentCertificatesList`, `CertificateCreateForm`, specialist detail/edit dialogs |
| Business config | `issuerListApi="business"`, `businessCertificatesPageCopy`, `business-owner-certificates/*` API adapter |
| Backend | `/api/pro/business-owner-certificates` (+ `[id]`, `batch`) |

## Prof-test policy delta (explicit)

**Allowed read (gate):** `GET /api/pro/business-owner-certificates`, `GET …/:id`, `GET /api/store/certificate/:id`.

**Denied without product allowlist change:** `POST /api/store/certificate`, `PATCH /api/pro/business-owner-certificates/:id`, `GET /api/certificate/:code/pdf`.

To extend prof-test to full owner write smoke, add routes in `profTestRoutePolicy.ts` under separate approval (out of scope here).

## Commands

```bash
# Backend unit + integration (prof-test DB for integration)
cd remcard-navigator && pnpm exec vitest run \
  src/lib/__tests__/businessOwnerCertificatesAccess.test.ts \
  src/lib/__tests__/storeCertificateOwnerDetailWhere.test.ts \
  src/lib/__tests__/profTestRoutePolicy.test.ts \
  src/app/api/pro/business-owner-certificates/__tests__/route.integration.test.ts

# Frontend
cd remcard-partner-platform && pnpm exec vitest run \
  src/lib/business-owner-certificates/ \
  src/lib/remcard-proxy-r03.test.ts \
  src/components/recommendations/CertificateCreateForm.*.test.tsx

# Browser gate
bash remcard-partner-platform/scripts/store-company-certificates-01/run-browser-gate.sh
```

No new SQL/schema/env/production login/business writes/deploy in this delivery.
