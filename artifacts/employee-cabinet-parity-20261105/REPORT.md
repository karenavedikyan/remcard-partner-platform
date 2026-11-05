# Employee cabinet parity (frontend)

## Base

- **Branch:** `cursor/remcard-employee-cabinet-parity-20261105`
- **Frontend base (production app266285):** `5d85aebe61b0284a2e8e36bf640cde29fd74e1e2`
- **Backend reference (read-only):** `bb7db4ca7165836f9165f9f851a5fffc5ba96b52`
- **Deliver commit:** `4764e129`

## Security boundary

- **Actor identity** stays on `GET /api/auth/me` (`AuthUser`: id, role, displayName, staffRole). Never substituted with `organization.ownerId`.
- **Presentation / workplace identity** comes only from `GET /api/pro/context` (`organization.partnerType`, `organization.name`, `role`, `teamCapabilities`). No `GET /api/pro/organization`, no admin APIs, no impersonation cookies.
- **Nav mode & templates** use `resolveCabinetPresentation` → `workplacePartnerType` + `resolveCabinetNavMode`. Owner PRO profile still wins for the authenticated owner; employees use org context only.
- **Fail-closed for org employees** (`readiness.isEmployee`): 401/403/missing context, unknown `proContext.role`, or org-member role without resolvable `partnerType` → `SessionGate` in `CabinetShell` / home.
- **PARTNER_EMPLOYEE** (employer-only, no `partnerType`): no invented type; legacy shell allowed when context is valid (documented gap below).
- **Section gates** (`business-clients`, `business-partners`, issuer/clients gates): eligibility still requires real context role + CLIENT staff vs PRO owner rules; manage actions remain behind existing `teamCapabilities` / API 403.

## Known limitations / gaps

- **PARTNER_EMPLOYEE / employer-only context:** no `organization.partnerType`; UI stays legacy (no store/company prototype parity) until backend exposes a trusted workplace type.
- **Double fetch:** `CabinetShell` and some pages each call `/api/pro/context` (acceptable; no caching layer in this change).
- **Agent pilot shell:** presentation provider wraps agent shell; agent nav unchanged.

## Tests

```bash
npm test -- --run \
  src/lib/cabinet-presentation/resolve.test.ts \
  src/lib/cabinet-nav/mode.test.ts \
  src/lib/business-home/gate.test.ts \
  src/lib/business-partners/gate.test.ts \
  src/lib/business-clients/gate.test.ts \
  src/components/layout/AppShell.nav.test.tsx \
  src/components/layout/AppShell.test.tsx

npm run build
```

**Smoke (dev only):** `/dev/employee-cabinet-parity?fixture=storeEmployee|companyTeamMember` — synthetic actor + pro context, no live API.

## Changed files (product)

- `src/lib/cabinet-presentation/*` (types, resolve, server, test-fixtures, resolve.test.ts)
- `src/lib/cabinet-nav/mode.ts`, `mode.test.ts`
- `src/lib/profile-cabinet-access.ts`
- `src/lib/business-home/gate.ts`, `gate.test.ts`
- `src/lib/business-clients/gate.ts`, `gate.test.ts`
- `src/lib/business-partners/gate.ts`, `gate.test.ts`
- `src/lib/settlements-page-shell.ts`
- `src/components/layout/CabinetShell.tsx`, `CabinetAppShellClient.tsx`, `CabinetPresentationContext.tsx`, `AppShell.tsx`
- `src/components/layout/AppShell.nav.test.tsx`, `AppShell.test.tsx`
- `src/components/clients/OwnerClientsGate.tsx`
- `src/components/specialist-certificates/OwnerIssuerGate.tsx`
- `src/app/page.tsx`, `settlements/page.tsx`, `partners/page.tsx`
- `src/app/dev/employee-cabinet-parity/page.tsx`
- `src/app/profile/dev-fixture/DevProfileFixtureChrome.tsx`
