# Cabinet nav persistent shell — review round 4 (security fixes, corrected M1)

Branch: `cursor/remcard-cabinet-nav-r4-template-20261103`.

## Soft-nav finding (blocking correction)

On **Next.js 15.5.28**, `(cabinet)/template.tsx` **does not re-execute on soft navigation** between sibling pages (confirmed with in-repo `nav/template-probe`: page RSC updates; template/layout server output for the route group stays pinned). Next only re-renders from the first differing segment (`renderComponentsOnThisLevel` / Flight router state).

**Implication:** A route-group template cannot supply a fresh shell-context token on in-cabinet soft nav. M1 was corrected to run the token on **each page segment** instead.

## M1 — Identity staleness (corrected)

- **`CabinetShell` (`src/components/layout/CabinetShell.tsx`)**: Thin **server** wrapper restored on all 18 `(cabinet)` pages (same `returnTo` prop as baseline). Uses `peekCabinetSession` + `computeCabinetShellContextToken` (no redirect, no prefs/partnership fetch, no AppShell). Renders **`CabinetShellTemplateReconciler`** around `{children}`.
- **Persistent `(cabinet)/layout`**: Still owns `CabinetAppShellClient` + layout token (unchanged).
- **`template.tsx`**: **Removed** (ineffective for soft nav).
- **Reconciler + context**: Compares page fresh token vs layout shell token; mismatch ⇒ detail skeleton + capped `router.refresh()`.
- **Loop guard fix**: Clear refresh-pair map on token match, on layout `shellContextToken` change, and allow **one retry** per stale pair if layout token unchanged after refresh (fixes A→B→A→B hang).

### Page parity vs baseline `bbf06ef8`

- **17 routes**: Restored verbatim from baseline paths (pure move into `(cabinet)/`).
- **`(cabinet)/page.tsx` (home)**: Not byte-identical — retains r3 **home role-parity** (`redirectIfProfCabinetRoleDenied`, request-scoped upstream cache helpers). **Obstacle to full byte parity:** those review-round fixes must stay; only `CabinetShell returnTo="/"` wrappers were re-added around the three dashboard branches.

### Token fields (unchanged)

`id | role | staffRole | partnerType | sorted partnerActivities | remcard-pro-branch` → SHA-256 (32 hex). Peek null ⇒ `"none"`. Raw cookie/session display fields never reach client/HTML.

## M2 — Fail-closed clear (unchanged)

`auth-failure` prefs source, generation bump, badge/bell epoch, `router.refresh()` on 401/403.

## Tests

| Area | Vitest (`--maxWorkers=1`) |
|------|---------------------------|
| Token helper | `cabinet-shell-context-token.test.ts` |
| Page wrapper | `CabinetShell.test.tsx` |
| Reconciler | `CabinetShellTemplateReconciler.test.tsx` |
| Loop guard A→B→A→B | `cabinet-shell-context-loop-guard.test.tsx` |
| Shell remount / analytics | `cabinet-shell-context-remount.test.tsx`, `ProfPartnerSessionVisitOnPathname.test.tsx` |
| M2 | `agent-cabinet-ui-prefs-apply.test.tsx`, monotonic + path refresh hooks |
| Routing contract | `(cabinet)/cabinet-routing-contract.test.tsx` (requires `CabinetShell`, no `template.tsx`) |

**Focused gate:** 76 passed (`logs/vitest-focused.log`).

**Full suite:** 7 failing files — same as base `bbf06ef8` (`logs/vitest-full-failures.txt`). Not claimed green.

**`tsc --noEmit`:** exit 0 (`logs/tsc-noEmit.log`).

## r4 commits (latest)

| SHA | Summary |
|-----|---------|
| `4167a940` … `1c2c7769` | Initial r4 token + M2 |
| `88bc8c13` | Per-page `CabinetShell` wrapper; delete template; loop guard |
| `3b782319` | Wrapper + loop tests |
| `9569cb71` | Reconciler test stabilization |

## Unresolved

- Live-server proof of upstream request-count reduction remains **unproven**.
- Seven unrelated full-suite failures unchanged on this branch.

**READY NOT DEPLOYED**
