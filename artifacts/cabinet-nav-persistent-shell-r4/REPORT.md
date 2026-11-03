# Cabinet nav persistent shell — review round 4 (security fixes)

Branch: `cursor/remcard-cabinet-nav-r4-template-20261103` (continues nav work from `1221f39b`).

## What changed (r4 only)

Two audit regressions addressed with narrow, additive product changes—no new APIs, no module-level caches, no dependency or backend changes.

### M1 — Identity staleness in persistent `(cabinet)` layout

- **`src/lib/cabinet-shell-context-token.ts`**: Server helper builds a canonical payload from request-cached peek user fields only: `id`, `role`, `staffRole`, `partnerType`, sorted `partnerActivities`, and the **`remcard-pro-branch`** cookie value read via `cookies()`. Payload is SHA-256 hashed (32 hex chars). Peek `null` ⇒ token `"none"`. Raw cookie, session token, `displayName`, `city`, `catalogStatus`, and prefs never appear in HTML/RSC props or client bundles.
- **`layout.tsx`**: Computes the same token and passes `shellContextToken` into `CabinetAppShellClient` (still non-redirecting).
- **`template.tsx` + `CabinetShellTemplateReconciler`**: Re-rendered every soft navigation; compares fresh token to shell context. Match ⇒ render children; mismatch ⇒ detail skeleton + single `router.refresh()` per `(shellToken, freshToken)` pair. Loop guard lives in **`CabinetShellContextProvider`** (`refreshedPairsRef`), not in the template (template remounts each navigation).
- **`CabinetAppShellClient`**: Provides context; keys **`AppShell`** by token and **`AgentAppShell`** by `` `${token}:${contextKey}:${user.id}` ``; notification bell remounts on token or auth-failure epoch.
- **`ProfPartnerSessionVisitOnPathname`**: Visit tracker key is `` `${shellToken}:${pathname}` `` so analytics does not attribute visits to the wrong identity.

### M2 — Fail-closed clear on 401/403

- **`agent-cabinet-ui-prefs-apply`**: New source `"auth-failure"` bypasses version and in-flight guards.
- **`useAgentCabinetUiPrefs`**: Auth-failure clear bumps an apply generation, resets `versionRef` to 0, and drops late GET/PATCH tied to an older generation.
- **`useAgentCabinetPrefsPathRefresh` / `useIncomingPartnersCount`**: Use `applyAuthFailureClear`, `notifyAuthFailure()` (bell epoch), then `router.refresh()`.

## Token fields (canonical order)

1. `user.id`
2. `user.role` (empty string if missing)
3. `user.staffRole` (empty if null)
4. `user.partnerType` (empty if null)
5. Sorted `partnerActivities` joined with `\u001f`
6. `remcard-pro-branch` cookie value (empty if absent)

## Why the raw branch cookie never reaches the client

Only the hash is passed as `shellContextToken`. The cookie is read on the server inside the token helper; the canonical string and cookie value are not exported to client components except as part of the one-way hash.

## Loop guard design

`CabinetShellContextProvider` keeps a `Set` of `` `${shellToken}|${freshToken}` `` pairs that already triggered `router.refresh()`. The template reconciler calls `requestShellRefreshIfStale` on mismatch; duplicate navigations with the same stale pair do not refresh again. After refresh, layout recomputes `shellContextToken` to match the fresh template token.

## Tests

| Area | Unit (Vitest, `--maxWorkers=1`) | Native / live |
|------|----------------------------------|---------------|
| Token helper | `cabinet-shell-context-token.test.ts` | — |
| Template reconciler | `CabinetShellTemplateReconciler.test.tsx` | — |
| Shell remount | `cabinet-shell-context-remount.test.tsx` | — |
| Analytics re-key | `ProfPartnerSessionVisitOnPathname.test.tsx` | — |
| Auth-failure prefs | `agent-cabinet-ui-prefs-apply.test.tsx`, `useAgentCabinetUiPrefs.monotonic.test.tsx`, `useAgentCabinetPrefsPathRefresh.test.tsx` | PATCH/GET under real latency |
| Prior nav gate | unchanged focused list (72 tests in r4 gate) | Request-count reduction on live server **unproven** |

Focused gate log: `logs/vitest-focused.log` (72 passed).

Full suite: **7 failing files** — same as base `bbf06ef8` (see `logs/vitest-full-failures.txt`). Not claimed green.

`tsc --noEmit`: exit 0 (`logs/tsc-noEmit.log`).

## r4 commits

| SHA | Summary |
|-----|---------|
| `4167a940` | Hashed shell context token helper |
| `fcb6acdf` | Template reconciler + shell wiring |
| `1c2c7769` | Auth-failure force-clear for agent prefs |
| `5b20bb76` | Tests |

## Unresolved gaps

- No live-server proof that upstream request counts dropped with persistent shell + dedupe.
- Full Vitest suite still has 7 pre-existing unrelated failures on this branch.

**READY NOT DEPLOYED**
