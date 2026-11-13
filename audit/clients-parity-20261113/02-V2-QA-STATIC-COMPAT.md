# V2-QA static compatibility (impl candidate)

**Task:** REMCLIENTS-PARITY-20261113-V2-QA  
**Canonical:** https://www.perplexity.ai/computer/tasks/c7ca575a-0a2a-4ae4-92b9-0e0c535046f8  
**Author agent:** `bc-597b1474-d7e7-4df1-b4a2-cf2f6abcb629`  
**Author branch:** `cursor/remcard-cabinet-nav-r5-final-20261103`  
**Production base (compat target):** `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79`  
**Prototype etalon:** `3dc31836cd18d9209c20097f18b906dd276f7af6`  
**Auditor branch:** `cursor/remcard-wallet-dialog-width-20261103`

## Candidate SHAs checked (not substituted by auditor HEAD)

| SHA | Role | Notes |
|---|---|---|
| `b0622e519a4aea9b8ffbeac194e95d40a196ec8b` | Named interim candidate | First REMCLIENTS wire-up; **drops** `canLinkOnboardingHistory` |
| `87c5ef62…` | Intermediate | Restores onboarding prop + expands observer presentation |
| **`ffd4aa6130e92af5d95da21cfe5519133228a962`** | **Current implCandidateSha** | Tip of author branch at audit time (docs matrix + props test) |

`implCandidateSha` for this V2 report = **`ffd4aa6130e92af5d95da21cfe5519133228a962`**.  
Auditor HEAD (`auditSha`) is the commit that lands these audit artifacts (not the product candidate).

## Ancestry vs `57ca4680`

```
merge-base(ffd4aa61, 57ca4680) = bbf06ef8e371ad31193274ee59600f39c4dea920
git merge-base --is-ancestor 57ca4680 ffd4aa61 → exit 1 (NOT an ancestor)
```

Same for `b0622e51`. Candidate is **diverged** from the pinned production base (cabinet-nav lineage). Treat as large delta; do not claim “clean rebase on 57ca4680”.

## `canLinkOnboardingHistory` (critical compat)

### `b0622e51` — **FAIL / regression**

| Location | Base `57ca4680` | `b0622e51` |
|---|---|---|
| `src/app/clients/page.tsx` (base) / `(cabinet)/clients/page.tsx` (cand) | Passes `canLinkOnboardingHistory={canLinkOnboardingHistoryFromUserRole(user.role)}` | **Prop omitted**; workspace rendered bare |
| `ClientsListWorkspace` | Accepts + forwards prop | **No props**; `<OwnerClientsGate>` without prop |
| `ClientsListWorkspace.history-prop.test.tsx` | Present | **Deleted** (no replacement yet) |

### `ffd4aa61` — **compat prop restored (static PASS for this prop only)**

| Location | Status |
|---|---|
| `(cabinet)/clients/page.tsx` | Restored `canLinkOnboardingHistoryFromUserRole` wiring |
| `ClientsListWorkspace` / `OwnerClientsGate` / context | Prop accepted and forwarded |
| `ClientsListWorkspace.props.test.tsx` | Source-level assert for page + workspace |
| `history-link-eligibility.ts` | Present; matches base semantics (`role === "PRO"`) |

**Does not equal full gate parity:** tip rewrites `OwnerClientsGate` away from `useCabinetPresentation` + `useBusinessSectionDispatch` to ad-hoc `fetchAgentR03Status` / `fetchSpecialistR06Status` / `/api/auth/me` + `/api/pro/context`. That is a **behavioral divergence** from `57ca4680` gate (loading skeleton path, eligibility order, error copy). Status: **FAIL (gate rewrite)** for merge-safety vs base, even though the prop itself is present.

## Routing / shell delta (selected files)

- Base clients page: `src/app/clients/page.tsx`  
- Tip clients page: `src/app/(cabinet)/clients/page.tsx` (+ loading / `[id]`) — path move from cabinet-nav work, not a pure Clients overlay.
- Body: `AgentClientsList` → `ClientsDirectionWorkspace` (agent → observer-only; specialist/business → direction tabs + receiving blocker).

## Pure UI vs data adapter (author instruction alignment)

Tip correctly keeps `fetchObserverReferredAppeals()` returning `BLOCKED_CONTRACT` and renders UI with fixture-only tests. **Auditor agrees** pure UI may proceed while data adapter stays BLOCKED — but visual parity is still **FAIL** (see candidate-mount). Safety PASS (C55/C56) ≠ functional readiness.

## Worktrees used (read-only)

- `/tmp/clients-cand-b0622e51` @ `b0622e51`
- `/tmp/clients-cand-ffd4aa61` @ `ffd4aa61`
