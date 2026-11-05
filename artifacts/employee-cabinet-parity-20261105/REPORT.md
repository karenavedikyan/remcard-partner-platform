# Employee cabinet parity (frontend)

## Base

- **Branch:** `cursor/remcard-employee-cabinet-parity-20261105`
- **Frontend base (production app266285):** `5d85aebe61b0284a2e8e36bf640cde29fd74e1e2`
- **Backend reference (read-only):** `bb7db4ca7165836f9165f9f851a5fffc5ba96b52`
- **Deliver commit (R2):** `dc66615c5e03266844729bdff522e41efcb7f425`

## R2 fixes (review 02bd175)

1. **Org-first workplace:** `resolveWorkplacePartnerTypeResolution` validates context, prefers org member roles (incl. PRO personal STORE/COMPANY/MASTER/AGENT) before personal profile; personal fallback only when not org staff employee.
2. **Nav:** `resolveCabinetNavMode({ workplaceNavFromOrgContext: true })` overrides personal MASTER / pure-agent legacy for org workplace.
3. **Gates / dispatch:** org workplace members (any account role) eligible for business clients/partners shell; `resolveBusinessSectionDispatch` routes org staff before R03/R06; ORG_OWNER keeps R03 first.
4. **Home:** `BusinessOrgStaffHomeTemplate` for org staff (no owner metrics / onboarding API); owner keeps `BusinessOwnerHomeDashboard`.
5. **Employee blocks:** `resolveCabinetPresentationBlock` — 401 → SessionGate; 503 → transient retry UI; suspended/invalid context → workplace block (not logout).
6. **Presentation provider:** gates use `useCabinetPresentation` + shared dispatch hook; branch switch dispatches `remcard:cabinet-presentation-changed` + `router.refresh()` (no full reload loop).
7. **Dev fixture:** static template only (`/dev/employee-cabinet-parity`) — not for live-API native acceptance.

## Security boundary

- Actor = `/api/auth/me` only. Workplace = validated `/api/pro/context`. Never `organization.ownerId` in wallet scope.
- No owner-only API unlock (`/api/pro/organization`, R03 owner mutations, requisites panel blocked for staff in UI; server 403 remains authority).
- Wallet settlements: session `fetchSettlements()`; errors surface as blocked text, not fake zeros.

## Backend gaps (unchanged)

- `PARTNER_EMPLOYEE` employer-only: no trusted `partnerType` → legacy shell.
- Org employee wallet **read**: no explicit `teamCapabilities` wallet flag; 403 → honest empty/error in UI.

## Verification (executed on branch)

### Focused parity suite (49 tests)

```text
$ npx vitest run src/lib/cabinet-presentation src/lib/business-workplace \
  src/lib/business-home/access.test.ts src/lib/business-clients/gate.test.ts \
  src/lib/business-partners/gate.test.ts src/lib/cabinet-nav/mode.test.ts \
  src/components/layout/AppShell.test.tsx src/components/layout/AppShell.nav.test.tsx \
  src/components/home/BusinessOrgStaffHomeTemplate.test.tsx src/components/business-wallet

 Test Files  13 passed (13)
      Tests  49 passed (49)
   Duration  ~3.2s
```

### Stock Next build

```text
$ npm run build
✓ Compiled successfully
✓ Generating static pages — exit 0
```

### Full repo test (stock regression signal)

```text
$ npm test
 Test Files  11 failed | 461 passed | 1 skipped (473)
      Tests  31 failed | 2128 passed | 2 skipped (2161)
```

Failures are in unrelated areas (e.g. `ProfileEditor.*`, `AgentPartnersHub.specialist-prototype-link`, `category-display.test.ts`, `BusinessOwnerHomeDashboard.load` timing) — not modified in this parity diff; coordinator should triage separately. Parity-focused suite above is green.

## Changed files (product + tests)

See `git diff 5d85aebe..HEAD --stat`. Key additions: `cabinet-presentation/validate.ts`, `access-block.ts`, `business-workplace/dispatch-priority.ts`, `BusinessOrgStaffHomeTemplate.tsx`, `CabinetPresentationBlock.tsx`, `CabinetPresentationRefreshListener.tsx`.
