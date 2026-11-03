# Cabinet nav persistent shell — review round 4 (final items)

Branch: `cursor/remcard-cabinet-nav-r4-template-20261103`  
Base before nav work: `bbf06ef8e371ad31193274ee59600f39c4dea920`  
Tip after this pass: `2707583f` (see item commits below).

## Soft-nav finding (unchanged, blocking)

On **Next.js 15.5.28**, the `(cabinet)` **route-group layout** persists across in-cabinet soft navigation; **layout/template server code does not re-run** on sibling soft nav. Fresh shell identity must come from the **page segment** (`CabinetShell` / `SessionGate` reporter), not from a route-group template.

## Loop guard design (implemented)

- Attempted-refresh pairs live in a **`useRef` `Set`** inside `CabinetShellContextProvider` (mounts once with persistent layout).
- Reconciliation runs in **`useEffect`** with **primitive/stable callback deps** only — never during render, never `router.refresh()` during render.
- **Idempotent dedupe:** `${shellToken}|${freshToken}` in the ref set; **max one refresh per pair**; Strict Mode double effects must not double refresh.
- Set clears when a wrapper acknowledges a match and when layout `shellContextToken` changes.
- Tests model the **persistent provider** and swap page children via harness state (no provider-root rerender, no module/`globalThis` state).

## H1 — Partners/prefs auth loops (blocker)

- **`authFailureEpoch`** moved to a separate context so stable shell callbacks do not change identity when the bell remount epoch bumps.
- **`useIncomingPartnersCount`:** stable `useCabinetShellStableContext` callbacks only; **401** ⇒ badge `0` + bounded `requestShellRefreshIfStale("none")`; **403** ⇒ badge `0` only (no notify, no refresh).
- **`useCabinetShellPrefsPathRefresh`:** **401** ⇒ force-clear + one refresh; **403** ⇒ no clear, no refresh (valid employee denied on partnership list).
- Router calls use **refs** so `useRouter()` object identity does not retrigger effects.

## M1b — SessionGate null-user gap

- **`SessionGate`** (server): same peek + `computeCabinetShellContextToken` as `CabinetShell` (blocked/readiness/consents via peek — no extra upstream).
- **`CabinetShellIdentityReporter`** (client, no UI): reports fresh token in an effect; **AuthFlow stays visible** (not wrapped in skeleton reconciler).
- Optional **`shellContextTokenNone`**: profile/partners upstream failure emits `"none"` only when `profileResult.status === 401`; other SessionGate call sites unchanged.
- **`SessionGate` usage:** only under `src/app/(cabinet)/` (verified by repo grep).

## L-a — Fail-closed dead end

After one bounded refresh per stale pair, **`CabinetShellTemplateReconciler`** shows **`CabinetShellIdentityReconcileDeadEnd`** (Russian copy, reload via `window.location.reload`, focus ring, skeleton geometry). Navigating away / token match resets the cap.

## M3-1 — Agent prefs branch key (blocker)

- **`AgentCabinetShellBranch`** / **`LegacyCabinetShellBranch`** outer roots keyed by `shellContextToken` (+ agent `contextKey` + `user.id`) so pathname prefs hook state cannot leak across users/contexts.

## Token

Plain **SHA-256 truncated to 32 hex** via existing `hashCabinetShellContextPayload` — **no HMAC, no env secret**. Token material is server-side payload only; **never logged** in product code.

## Tests

| Gate | Result |
|------|--------|
| Focused nav (`logs/vitest-focused.log`) | **35 passed** (9 files, `--maxWorkers=1`) |
| Full suite (`logs/vitest-full-suite.log`) | **7 failing files** — same set as base `bbf06ef8` (`logs/vitest-full-failures.txt`); **not green** |
| `tsc --noEmit` (`logs/tsc-noEmit.log`) | **exit 0** |

## Item commits (this pass)

| Item | SHA | Summary |
|------|-----|---------|
| H1 | `10af7613` | Stable shell context; 401/403 split; hook loop fixes |
| M1b | `e50c6823` | SessionGate identity reporter + profile/partners 401 none |
| L-a | `d89d73c5` | Reconcile dead-end UI + reconciler cap behavior |
| M3-1 | `2707583f` | Key outer shell branches for prefs hook remount |

## Unresolved / honest gaps

- Live-server **request-count reduction** vs baseline remains **unproven** (no new upstream endpoints added; no QA harness run in this pass).
- Seven **non-nav** full-suite failures unchanged from base.
- Home `(cabinet)/page.tsx` still carries r3 role-parity helpers (not byte-identical to pre-nav baseline).

**READY NOT DEPLOYED**
