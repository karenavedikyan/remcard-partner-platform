# STORE-COMPANY-CERTIFICATES-01

**Status: READY FOR REVIEW** (no production deploy)

## Runtime SHAs (evidence)

| Repo | Published base | Evidence tip |
|------|----------------|--------------|
| remcard-partner-platform | `1dcd79c2b740a91c6bc7d9624ad8f7ba5ac96cf1` | `b58b9ae493f2d07112c569e0f06847467cab445a` (+ gate script/metadata commits on branch) |
| remcard-navigator | `f3baba9ca2666a569efea16d238ef8ca68e7ee2d` | `73b196aea91050b1eed1738d1ff87b1c8b0c6f07` (+ harness seed suffix fix on branch) |

Branch: `feat/store-company-certificates-01` (both repos).

## Reuse map (no duplicated list/builder)

| Capability | Reused | Minimal delta |
|------------|--------|----------------|
| List UI (cards/list, toolbar, search, filters, sort, pagination, batch archive/delete) | `AgentCertificatesList` | `accessMode="business"`, `issuerListApi`, copy via `businessCertificatesPageCopy` |
| Create flow | `CertificateCreateForm` + `SpecialistCertificateCreateDialog` | `issuerListApi` for alias PATCH |
| Detail / QR / link / PDF | `SpecialistCertificateDetailDialog` + `CertificateResultView` + `GET /api/store/certificate/[id]` | Detail GET scoped with `certificateListWhereForProContext`; meta from business-owner API |
| Edit alias / discounts | Existing specialist dialogs | `issuerCertificatesApi("business")` |
| Routing shell | `/recommendations` + `OwnerIssuerGate` | Mode `business` when `shouldRenderBusinessOwnerHome(me)`; R03 redirect unchanged |
| Backend ownership | `certificateListWhereForProContext` | New BFF routes `/api/pro/business-owner-certificates` (+ `[id]`, `batch`) with `requireBusinessOwnerCertificatesContext` |

Not copied: no `StoreCertificatesList` / `CompanyCertificatesList`, no second create builder.

## Endpoints & ownership

- **List / meta / mutations:** `GET|PATCH|DELETE /api/pro/business-owner-certificates/:id`, `GET /api/pro/business-owner-certificates`, `POST .../batch` — rows must match `certificateListWhereForProContext(user, proCtx)`; workspace archive is per viewer (`certificateProWorkspace`).
- **Create:** unchanged `POST /api/store/certificate` (issuer readiness, partnerships, limits).
- **Rich detail payload:** `GET /api/store/certificate/:id` now ANDs public lookup with the same list scope (org owner sees org certs).
- **Ineligible:** principal agent → agent certificates; R06 specialist → specialist issuer API; other PRO → legacy `RecommendationsList`.

## Prof-test policy (honest limits)

| Route | GET | POST/PATCH/DELETE |
|-------|-----|-------------------|
| `/api/pro/business-owner-certificates` | allowed | **not** allowlisted |
| `/api/pro/business-owner-certificates/:id` | allowed | **not** allowlisted |
| `/api/store/certificate` | allowed | **not** allowlisted (unchanged) |

Prof-test delegation can prove **list + detail read** for store/company owners. **Create / archive / edit in test mode** still requires explicit allowlist changes — not faked in this gate.

## Commands & gates

```bash
# Backend
cd remcard-navigator
pnpm exec vitest run src/lib/__tests__/businessOwnerCertificatesAccess.test.ts src/lib/__tests__/profTestRoutePolicy.test.ts
pnpm exec tsc --noEmit   # 52 diagnostics (baseline @ f3baba9)

# Frontend
cd remcard-partner-platform
pnpm exec vitest run src/lib/business-owner-certificates/copy.test.ts src/lib/remcard-proxy-r03.test.ts src/lib/business-home/gate.test.ts
pnpm run build
pnpm exec tsc --noEmit

# Isolated browser gate (single run)
bash scripts/store-company-certificates-01/run-browser-gate.sh
# exit: see artifacts/store-company-certificates-01/shell-browser-gate.exit
```

**Browser gate (2026-10-25T11:17:41.763Z):** `shell-gate.json` → `"ok": true`, `failures: []`, exit `0`. Screenshots: `artifacts/store-company-certificates-01/visual-shell/` (store/company, light/dark, 1440/390/320).

## Out of scope (unchanged production rules)

- Custom ad / multi-use demo modes not in production.
- No schema/migrations/env/deps changes.
- Home (`feat/store-company-home-adapt-02`) not reworked.
