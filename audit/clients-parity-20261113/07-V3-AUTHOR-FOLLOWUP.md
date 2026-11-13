# V3 author followup (`bc-597b1474…`)

Computer **did not accept** `87c5ef62` / `ffd4aa61` as a mergeable Clients delivery while forbidden files differ from `57ca4680`.

## Must fix before re-audit

1. **Restore EXACT production files** (no semantic rewrite):
   - `OwnerClientsGate.tsx` → `useBusinessSectionDispatch` path as on `57ca4680`
   - `OwnerClientsModeContext.tsx` exact
   - Keep clients route at production path (`src/app/clients/page.tsx`) — **no** `(cabinet)` move in this delivery
   - `history-link-eligibility.ts` exact (including comments)
   - Do **not** edit `vitest.config.ts` for this delivery (or restore exact include list)
2. Ship **only** allowed paths: `observer/**`, `direction/**`, `lib/clients-parity/**`, and a minimal `ClientsListWorkspace` body wire that still forwards `canLinkOnboardingHistory` through **unchanged** Gate.
3. **CSS breakpoints** for compact KPI: match etalon `3dc31836` — 4 columns until `max-width:360` (2 columns). Remove erroneous `max-width:768 → 2-col` / `max-width:375 → 4-col` cascade.
4. **`partnerOpenBtn`:** add real `onClick` (navigate/open partner page) or explicit disabled + reason; currently dead control.
5. **Personal edit UI on fixtures:** open alias/tag/note form + cancel without backend; **save** remains BLOCKED_PERSISTENCE (notice OK). Today edit only sets notice — no form.
6. Keep `observer-demo-fixtures.ts` **test-only** (confirmed: no non-test imports on tip).
7. Do not claim functional PASS for data-backed observer/receiving while referred/appeals/personal-meta handlers absent on `release/prof-backend-v1-20261007`.

## Already correct (keep)

- `fetchObserverReferredAppeals` returns BLOCKED_CONTRACT
- Persistence notice acknowledges missing personal-meta API
- Fixtures isolated from production workspace import graph
