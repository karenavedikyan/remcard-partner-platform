# Employee cabinet parity (frontend)

## Base

- **Branch:** `cursor/remcard-employee-cabinet-parity-20261105`
- **Frontend base (production app266285):** `5d85aebe61b0284a2e8e36bf640cde29fd74e1e2`
- **Backend reference (read-only):** `bb7db4ca7165836f9165f9f851a5fffc5ba96b52`
- **Deliver commit (R2 + vitest R1):** `cb795341822f50fe7a9c0b80ca766d9c0fe9f483`

## R2 fixes (review 02bd175)

1. **Org-first workplace:** `resolveWorkplacePartnerTypeResolution` validates context, prefers org member roles (incl. PRO personal STORE/COMPANY/MASTER/AGENT) before personal profile; personal fallback only when not org staff employee.
2. **Nav:** `resolveCabinetNavMode({ workplaceNavFromOrgContext: true })` overrides personal MASTER / pure-agent legacy for org workplace.
3. **Gates / dispatch:** org workplace members (any account role) eligible for business clients/partners shell; `resolveBusinessSectionDispatch` routes org staff before R03/R06; ORG_OWNER keeps R03 first.
4. **Home:** one `BusinessOwnerHomeDashboard` for owner and org staff (`homeAccessMode`: `owner-operating` | `org-staff-view`). Staff skips owner metrics / supplemental probes / onboarding banners; metrics show `—` with unavailable slices; company hero CTA can stay disabled via `teamActionsEnabled`; store staff uses `ProfileBranchContextSwitcher` in the branch-picker slot.
5. **Profile:** org staff use shared `ProfileEditor` with `businessOrgProfileSectionNav()` (same tab labels/order as STORE/COMPANY owner). Locked sections stay visible with `ProfileSectionAccessGate`; team follows `canOpenTeamSection` without privileged fetches when blocked.
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

### Focused parity suite (stock vitest whitelist + explicit CLI paths)

Vitest `include` uses globs `src/lib/cabinet-presentation/**/*.test.ts`, `business-workplace/**`, `business-wallet/**`, plus `settlements-page-shell.test.ts`. Gate components: `OwnerClientsGate.test.tsx`, `OwnerIssuerGate.test.tsx` (auto via `src/**/*.test.tsx`).

```text
$ npx vitest run \
  src/lib/cabinet-presentation/resolve.test.ts \
  src/lib/cabinet-presentation/validate.test.ts \
  src/lib/cabinet-presentation/access-block.test.ts \
  src/lib/cabinet-presentation/workplace-matrix.test.ts \
  src/lib/business-workplace/dispatch-priority.test.ts \
  src/lib/business-home/access.test.ts \
  src/lib/business-home/gate.test.ts \
  src/lib/business-clients/gate.test.ts \
  src/lib/business-partners/gate.test.ts \
  src/lib/business-wallet/access.test.ts \
  src/lib/cabinet-nav/mode.test.ts \
  src/lib/settlements-page-shell.test.ts \
  src/components/layout/AppShell.test.tsx \
  src/components/layout/AppShell.nav.test.tsx \
  src/components/home/BusinessOwnerHomeDashboard.staff-view.test.tsx \
  src/lib/profile-section-access.test.ts \
  src/components/profile/ProfileEditor.org-staff-tab-parity.test.tsx \
  src/components/business-wallet/BusinessOwnerWallet.history-prop.test.tsx \
  src/components/clients/OwnerClientsGate.test.tsx \
  src/components/specialist-certificates/OwnerIssuerGate.test.tsx

 ✓ src/components/home/BusinessOwnerHomeDashboard.staff-view.test.tsx
 ✓ src/components/clients/OwnerClientsGate.test.tsx
 ✓ src/components/layout/AppShell.nav.test.tsx
 ✓ src/components/layout/AppShell.test.tsx
 ✓ src/components/specialist-certificates/OwnerIssuerGate.test.tsx
 ✓ src/components/business-wallet/BusinessOwnerWallet.history-prop.test.tsx
 ✓ src/lib/cabinet-presentation/resolve.test.ts
 ✓ src/lib/business-clients/gate.test.ts
 ✓ src/lib/business-workplace/dispatch-priority.test.ts
 ✓ src/lib/cabinet-nav/mode.test.ts
 ✓ src/lib/business-partners/gate.test.ts
 ✓ src/lib/business-home/gate.test.ts
 ✓ src/lib/cabinet-presentation/workplace-matrix.test.ts
 ✓ src/lib/cabinet-presentation/access-block.test.ts
 ✓ src/lib/settlements-page-shell.test.ts
 ✓ src/lib/cabinet-presentation/validate.test.ts
 ✓ src/lib/business-home/access.test.ts
 ✓ src/lib/business-wallet/access.test.ts

 Test Files  18 passed (18)
      Tests  68 passed (68)
   Duration  ~3.4s
```

Full log: `/opt/cursor/artifacts/employee-cabinet-parity-vitest-focused.log` (on agent VM).
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

See `git diff 5d85aebe..HEAD --stat`. Key additions: `cabinet-presentation/validate.ts`, `access-block.ts`, `business-workplace/dispatch-priority.ts`, unified business home/profile chrome for org staff, `CabinetPresentationBlock.tsx`, `CabinetPresentationRefreshListener.tsx`.
