# Cabinet navigation — persistent shell & stable loading

**READY NOT DEPLOYED**

## Base and commits

| Role | SHA |
| --- | --- |
| Base (verified) | `bbf06ef8e371ad31193274ee59600f39c4dea920` |
| Commit 1 — request dedupe | `a9a269e77db3328c6d90dcd181b4111a42da0cde` |
| Commit 2 — persistent shell | `a057025501c8d03a54d679c833b9a855659ecddd` |
| Commit 3 — stable loading | `62b887f51b2b1c152b9decc49fa7e2fe4c2f2080` |
| Commit 4 — review round 2 fix | `9c98c0ae8e0e3c754c0b3c5db402ac639bbda808` |
| Commit 5 — requestCache runtime | `48f04b9d8b93730a5439a13baf24bddcedd9b74b` |
| Commit 6 — review round 3 (mocks + home order) | `f231e5031d1085526811363b64c6523aebf227aa` |

## Moved routes (git rename)

See `moved-files.txt` — 18 `page.tsx` routes under `src/app/(cabinet)/` plus `pureAgentProfilePage.module.css`. `src/app/partners/dev-fixture/` and `src/app/settlements/dev-fixture/` stay outside the group.

## Auth nuance (layout peek vs page guards)

- `peekCabinetSession` never redirects; layout renders bare `{children}` when not allowed.
- **No session / missing readiness:** `requireProPageUser` → `null` → `SessionGate`; peek → `null` (no shell).
- **Home redirect order (commits 4–6):** after readiness gates, `resolveActiveAgentRootRedirect` runs first (prefs load + agent root), then `isProfCabinetAllowed` → `redirect("/?reason=role")`, then home branches — same precedence as pre–route-group page before shell extraction. Covered by `page.admin-root-redirect.test.tsx` (“applies active-agent root redirect before the role gate”).

## Stale badge / UI prefs (corrected)

- **`router.refresh()` does not replace agent prefs by itself:** `useAgentCabinetUiPrefs` holds client state; layout `initialPrefs` only rehydrate through monotonic `applyIncoming(..., "initial")` when version/keys change.
- **Monotonic rules (commit 4):** `shouldApplyIncomingCabinetUiPrefs` — PATCH always wins; GET/initial blocked while `saveInFlightCount > 0`; GET/initial only if `incoming.version >= versionRef.current`.
- **Path refresh:** `useAgentCabinetPrefsPathRefresh` + `useIncomingPartnersCount` use abort + cancelled flags; **401/403** → neutral state (badge `0` / `neutralCabinetUiPreferencesFallback`) + `router.refresh()`.

## Analytics cadence

`ProfPartnerSessionVisitOnPathname` — `key={pathname}` only (no query/PII); consent rules unchanged.

## Skeleton / gate loading (commit 4)

- **`AgentR03Gate`:** body-only shimmer (`CabinetPageLoadingSkeletonBody`) — page `PageHeading` stays single h1.
- **`OwnerClientsGate` / `OwnerIssuerGate`:** full heading skeleton (heading rendered inside gate children).
- **Detail/new `loading.tsx`:** `CabinetPageDetailLoadingSkeleton` — neutral heading bars + body (clients/[id], certificates/new|/[id], recommendations/new|/[id]).

## Pathname dismiss (commit 4)

On pathname change (not query-only): `AppShell` closes mobile menu + more sheet; `AgentAppShell` closes more + editor; `AccountSessionMenu` and `ProfNotificationBell` close open panels.

## Upstream calls (typical guarded tab)

| Upstream | Before | After (commits 1–2) |
| --- | ---: | ---: |
| `/api/auth/me` | 3 | 1 |
| `/api/account/cabinet-readiness` | 2 | 1 |
| `/api/partnership/list` | 1/server nav | 1 layout + 1 client refresh per pathname |
| `/api/pro/cabinet-ui-preferences` | 1 | 1 layout + 1 client refresh per pathname (agent shell) |

Home `/` uses cached readiness/prefs/list helpers (commit 4) — dedupes with layout/peek on same request.

## Test files touched (route move / layout / review)

| File |
| --- |
| `src/app/(cabinet)/page.admin-root-redirect.test.tsx` |
| `src/lib/clients-rsc-boundary.test.ts` |
| `src/app/(cabinet)/cabinet-routing-contract.test.tsx` |
| `src/lib/session-peek.test.tsx` |
| `src/lib/cabinet-shell-request-dedupe.test.tsx` |
| `src/hooks/useIncomingPartnersCount.test.tsx` |
| `src/lib/agent-cabinet-ui-prefs-apply.test.tsx` |
| `src/components/layout/agent/useAgentCabinetUiPrefs.monotonic.test.tsx` |
| `src/components/layout/cabinet-pathname-dismiss.test.tsx` |
| `src/components/layout/CabinetPageLoadingSkeleton.heading.test.tsx` |
| `src/components/agent-r03/AgentR03Gate.stale-route.test.tsx` |
| `src/components/layout/AppShell.nav.test.tsx` |
| `src/components/layout/AppShell.test.tsx` |
| `src/components/account-session/AccountSessionMenu.acceptance.test.tsx` |
| (+ existing shell/analytics/skeleton tests unchanged paths) |

## Tests — unit vs native

| Area | Unit / vitest | Native / manual |
| --- | --- | --- |
| Request dedupe | `cabinet-shell-request-dedupe.test.tsx` mocks `requestCache` with a **per-test** memo to verify loader wiring only; production uses `React.cache` when present (Next RSC) and **identity** in plain Node/Vitest (React 18.3 has no runtime `cache`). No production test hook, no module-level Map. | **Native auditor:** upstream counts per navigation on live server |
| Prefs monotonic | `agent-cabinet-ui-prefs-apply.test.tsx`, `useAgentCabinetUiPrefs.monotonic.test.tsx` | PATCH/GET race under real latency |
| Pathname dismiss | `cabinet-pathname-dismiss.test.tsx` | Back/forward, mobile more sheet |
| Skeleton headings | `CabinetPageLoadingSkeleton.heading.test.tsx` | Visual geometry vs final content |
| Home role guard | `page.admin-root-redirect.test.tsx` | — |
| Sidebar identity | `cabinet-shell-persistence.test.tsx` | Cold/warm DOM identity |

Logs: `logs/vitest-full-suite.log` (454 files, `maxWorkers=1`, **7** failed files — base-only set in `logs/vitest-full-failures.txt`), `logs/vitest-focused.log` (**54** tests), `logs/tsc-noEmit.log` (command + exit **0**).

## Artifact checksums

From `artifacts/cabinet-nav-persistent-shell/`: `sha256sum -c SHA256SUMS.txt` (includes `partner-nav.tar.gz`).
