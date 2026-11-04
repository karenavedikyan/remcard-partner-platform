# Empty-state first-paint (2026-11-04)

## Branch / SHAs

| Item | SHA |
|------|-----|
| Parent (deployed frontend) | `f434708132ce9a4334cb500e129b87d02588ea29` |
| Product branch | `cursor/remcard-empty-state-first-paint-20261104` |
| Product tip | `24e1e2d2` |
| Backend (unchanged) | `bb7db4ca` |
| Nav branch preserved | `cursor/remcard-cabinet-nav-r4-template-20261103` @ `c2ab37436c478ab2fd9739eafa941cd41114bb59` |

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
- Tests: `*.first-paint.test.tsx`, `ScannerHub.empty-state.test.tsx`, `BusinessOwnerHomeDashboard.presentation.test.tsx`
- `artifacts/empty-state-first-paint-20261104/*`

## Eight welcome consumers audit

| Site | Status | Notes |
|------|--------|-------|
| Home (specialist / store / company) | **Fixed** | Skeleton while metrics and/or supplemental probes pending; no hero before decision |
| Clients | **Fixed** | Pending shell; baseline filter refetch keeps rows |
| Certificates | **Fixed** | Pending shell; filters/archived skip pending |
| Partners | **Fixed** | Head CTA + zones gated until `listReady` |
| Scanner | **Fixed** | Pending skeleton replaces hero flash; workbench retained (no hero) per f434 |
| Wallet (settlements) | **Not affected** | Existing loading gates in `WalletAccrualsWorkspace` |
| Team (profile) | **Fixed** | Pending shell in `ProfileTeamSection` |
| Profile empty wizards | **Not affected** | `ProfileSectionEmptyGate` is draft-driven, not list-load flash |
| Agent home (server) | **Not affected** | Server `HomeDashboard`, no client list→welcome swap |
| Recommendations | **Fixed** (same pattern) | Not in original eight URLs but same welcome class |

## Commands / results

```bash
npx vitest run \
  src/lib/welcome-first-paint/welcomeFirstPaintPending.test.tsx \
  src/components/agent-r03/AgentClientsList.first-paint.test.tsx \
  src/components/agent-r03/AgentCertificatesList.first-paint.test.tsx \
  src/components/partners/PartnersOverviewLayout.first-paint.test.tsx \
  src/components/scanner/ScannerHub.empty-state.test.tsx
# 5 files, 19 passed

npx vitest run src/components/home/BusinessOwnerHomeDashboard.presentation.test.tsx
# 4 passed

npx vitest run src/components/profile/ProfileTeamSection.test.tsx
# 5 passed

npx tsc --noEmit
# exit 0

npm run build
# exit 0, lockfile unchanged
```

## Baseline / out of scope

Full-suite nav failures on `cursor/remcard-cabinet-nav-r4-template-20261103` are unchanged and not part of this branch.

## Native Next transition proof

Deferred-promise RTL tests cover pending → welcome / list / error. No Playwright/native Next harness in repo for this slice; gap documented.

## Status

**READY — NOT DEPLOYED**

Mechanical integrator: apply `source.diff` vs `f4347081` on branch `cursor/remcard-empty-state-first-paint-20261104`.
