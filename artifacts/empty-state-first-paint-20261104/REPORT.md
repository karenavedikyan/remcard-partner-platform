# Empty-state first-paint (2026-11-04)

## Branch / SHAs

| Item | SHA |
|------|-----|
| Parent (deployed frontend) | `f434708132ce9a4334cb500e129b87d02588ea29` |
| Product branch | `cursor/remcard-empty-state-first-paint-20261104` |
| Product tip | _(set after push)_ |
| Backend (unchanged) | `bb7db4ca` |
| Nav branch preserved | `cursor/remcard-cabinet-nav-r4-template-20261103` @ `c2ab37436c478ab2fd9739eafa941cd41114bb59` |

## Blocker revision (partners error-aware pending)

**Issue in `24e1e2d2`:** `isPartnersOverviewPresentationPending` used `loading || !listReady`. After `loadList()` errors, Hub sets `listReady=false`, `loading=false`, and `error` — but `!listReady` kept the overview in infinite skeleton and hid `partners-overview-error` / retry.

**Fix:** Pending only when there is no `error`, no prior successful `listReady`, and the initial fetch is still in flight (`loading` or unresolved pre-response). Errors (HTTP, network, malformed payload) exit pending immediately. `listReady && loading` (same-user refresh) is not pending; legacy tiles stay mounted (`showFullLegacyOverview` no longer requires `!loading` when already ready).

## Allowlist (product)

- `src/lib/welcome-first-paint/welcomeFirstPaintPending.ts`
- `src/lib/welcome-first-paint/welcomeFirstPaintPending.test.tsx`
- `src/components/welcome-first-paint/WelcomeContentAreaPending.tsx`
- `src/components/welcome-first-paint/WelcomeContentAreaPending.module.css`
- `src/components/agent-r03/AgentClientsList.tsx`
- `src/components/agent-r03/AgentCertificatesList.tsx`
- `src/components/partners/PartnersOverviewLayout.tsx`
- `src/components/scanner/ScannerHub.tsx`
- `src/components/profile/ProfileTeamSection.tsx`
- `src/components/home/SpecialistHomeDashboard.tsx`
- `src/components/home/BusinessOwnerHomeDashboard.tsx`
- `src/components/recommendations/RecommendationsList.tsx`
- Tests: `*.first-paint.test.tsx`, `PartnersHub.first-paint.test.tsx`, `ScannerHub.empty-state.test.tsx`, `BusinessOwnerHomeDashboard.presentation.test.tsx`
- `artifacts/empty-state-first-paint-20261104/*`

## Eight welcome consumers audit

| Site | Status | Notes |
|------|--------|-------|
| Home (specialist / store / company) | **Fixed** | Skeleton while metrics and/or supplemental probes pending; greeting still requires `!loading` |
| Clients | **Fixed** | Pending only on baseline load; `loadState=error` not pending; rows kept on filter refetch |
| Certificates | **Fixed** | Same pattern as clients |
| Partners | **Fixed (revised)** | Error-aware pending + refetch keeps tiles when `listReady` |
| Scanner | **Fixed** | Pending replaces hero flash; workbench without hero per f434 |
| Wallet (settlements) | **Not affected** | Existing loading gates in `WalletAccrualsWorkspace` |
| Team (profile) | **Fixed** | `isTeamWelcomeDecisionPending`: errors not pending (already error-aware) |
| Profile empty wizards | **Not affected** | Draft-driven gate |
| Agent home (server) | **Not affected** | Server `HomeDashboard` |
| Recommendations | **Fixed** | `loadState=error` not pending |

**Cross-callsite audit:** No other helper used the partners `!listReady`-without-error trap. Team/clients/certs/recs already treat errors as settled.

## Commands / results

```bash
npx vitest run \
  src/lib/welcome-first-paint/welcomeFirstPaintPending.test.tsx \
  src/components/partners/PartnersOverviewLayout.first-paint.test.tsx \
  src/components/partners/PartnersHub.first-paint.test.tsx \
  src/components/agent-r03/AgentClientsList.first-paint.test.tsx \
  src/components/agent-r03/AgentCertificatesList.first-paint.test.tsx \
  src/components/scanner/ScannerHub.empty-state.test.tsx \
  src/components/home/BusinessOwnerHomeDashboard.presentation.test.tsx
# 7 files, 28 passed

npx tsc --noEmit
# exit 0
```

Prior report claim of partners error coverage in layout-only tests was **inaccurate** until `PartnersHub.first-paint.test.tsx` and layout error/refetch cases were added.

## Native Next transition proof

Deferred-promise RTL tests cover pending → error/retry → welcome and populated refetch. Coordinator native comparison (850ms collection baseline) runs separately after this revision.

## Status

**READY — NOT DEPLOYED**

Mechanical integrator: apply `source.diff` vs `f4347081` on branch `cursor/remcard-empty-state-first-paint-20261104`.
