# Cabinet navigation — persistent shell & stable loading

**READY NOT DEPLOYED**

## Base and commits

| Role | SHA |
| --- | --- |
| Base (verified) | `bbf06ef8e371ad31193274ee59600f39c4dea920` |
| Commit 1 — request dedupe | `a9a269e77db3328c6d90dcd181b4111a42da0cde` |
| Commit 2 — persistent shell | `a057025501c8d03a54d679c833b9a855659ecddd` |
| Commit 3 — stable loading | `62b887f51b2b1c152b9decc49fa7e2fe4c2f2080` |

## Moved routes (git rename)

See `moved-files.txt` — 18 `page.tsx` routes under `src/app/(cabinet)/` plus `pureAgentProfilePage.module.css`. `src/app/partners/dev-fixture/` intentionally left outside the group. `src/app/settlements/dev-fixture/` unchanged.

## Edited files (non-move highlights)

- `src/lib/request-cache.ts`, `src/lib/cabinet-upstream-cache.ts`, `src/lib/cabinet-shell-data.ts`, `src/lib/session.ts` (`peekCabinetSession`)
- `src/components/layout/CabinetShell.tsx` (still used by dev-fixtures / non-group callers)
- `src/app/(cabinet)/layout.tsx`
- `src/components/layout/AppShell.tsx`, `AgentAppShell.tsx`, `ProfPartnerSessionVisitOnPathname.tsx`
- `src/hooks/useIncomingPartnersCount.ts`
- `src/components/layout/CabinetPageLoadingSkeleton.tsx` + tab `loading.tsx` files
- Nav gates: `OwnerClientsGate`, `AgentR03Gate`, `OwnerIssuerGate`, `AgentR04Gate` (unused route gate, aligned for consistency)

## Upstream calls per navigation (typical guarded tab, e.g. `/clients`)

| Upstream | Before (serial, no dedupe) | After |
| --- | ---: | ---: |
| `/api/auth/me` | 3 | 1 |
| `/api/account/cabinet-readiness` | 2 | 1 |
| `/api/partnership/list` | 1 | 1 (layout initial); +1 client refresh per pathname via `useIncomingPartnersCount` |
| `/api/pro/cabinet-ui-preferences` | 1 | 1 |

Shell path after commit 1: auth/me + list + prefs load in one `Promise.all` wave once guards have run.

**Note:** `/` home still calls `fetchRemcardUpstream` for readiness directly (unchanged page logic); dedupe applies wherever `getSessionUser` / cached readiness / layout shell loaders participate.

## Stale badge / UI prefs

- **Partners badge:** `useIncomingPartnersCount` in `AppShell` and `AgentAppShell` — refetches `/api/partnership/list` on `pathname` change (abortable), same one-list-call-per-navigation volume as the old server shell refetch.
- **Agent mobile nav / theme prefs:** still driven by `useAgentCabinetUiPrefs(initialPrefs)`; `router.refresh()` re-runs the layout and replaces `initialPrefs` as before.

## Analytics cadence

`ProfPartnerSessionVisitOnPathname` wraps `ProfPartnerSessionVisit` with `key={usePathname()}` inside the persistent shell so consent-gated `recordProfSessionVisit` fires once per eligible pathname change (not on query-only changes). Consent rules unchanged.

## Nav gates changed

| Gate | Loading UI |
| --- | --- |
| `OwnerClientsGate` | `CabinetPageLoadingSkeleton` (`/clients` copy) |
| `AgentR03Gate` | certificates copy |
| `OwnerIssuerGate` | recommendations copy |
| `AgentR04Gate` | partners copy (component only; no route usage today) |

**Left unchanged:** wallet/history/partners hub internal loaders, `OwnerIssuerGate` logic, certificate card components, empty-state trees.

## Risks

- Layout peek uses the same allow rules as cabinet access but never redirects; pages must keep guards (verified by contract test).
- Client badge refresh adds a client fetch on pathname change; aborted on rapid switching to avoid stale writes.
- Home readiness double-fetch (page + peek/layout) remains possible on `/` for allowed users — out of scope for page-specific dedupe.

## Tests — unit vs native

| Area | Unit / vitest | Native / manual |
| --- | --- | --- |
| Request dedupe | `cabinet-shell-request-dedupe.test.tsx` (injectable request cache) | Full RSC request isolation in production |
| Peek / no redirect | `session-peek.test.tsx` | — |
| Routing contract | `cabinet-routing-contract.test.tsx` | — |
| Analytics cadence | `ProfPartnerSessionVisitOnPathname.test.tsx` | — |
| Sidebar DOM identity | Harness: same `aside` node on pathname rerender (`cabinet-shell-persistence.test.tsx`) | Cold/warm Next client navigation node identity |
| Skeleton geometry | Static heading text + grid min-heights; `role=status` | Delayed network: shimmer after ~130ms vs final layout |
| Stale route data | `AgentR03Gate.stale-route.test.tsx` (cancel on unmount) | Rapid tab switching, back/forward |

Logs: `logs/vitest-focused.log`, `logs/tsc-noEmit.log`.
