# REM-PUBLISH-RESIDUAL-20261113-V2 · П6 publication handoff

## Git

| | SHA |
|---|-----|
| **Candidate base** | `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0` |
| **Branch tip (pre-this-commit)** | `3753b24c5273a8d83b68ab88a06f0ebe6c38547c` |
| **Navigator release (preserve, read-only)** | `3c37ca2557069a43544b7d72848fd53c37e3be5e` (`release/prof-backend-v1-20261007`) |
| **Prototype ref** | `3dc31836cd18d9209c20097f18b906dd276f7af6` — `prototype-page-catalog.json` via GitHub MCP OK |

## Selected diff for Root packaging (P6-owned product only)

Cherry-pick / patch **only** these paths onto production clients parity bundle (not whole branch):

```
src/components/clients/direction/ClientsDirectionTabs.tsx
src/components/clients/direction/ClientsDirectionWorkspace.tsx
src/components/clients/direction/ReceivingAppealsBlocked.tsx
src/components/clients/observer/ObserverContractBlocked.tsx
```

Against `9fa6cc42`: **+390 / -26** lines including tests/audit in branch; product surface **~120 LOC** net.

**Do not** ship from this branch without Root gate review: `OwnerClientsGate`, routes, observer list, adapters unchanged on branch base.

## Source-verified role boundaries (immutable gate)

From `OwnerClientsGate` (read-only, production pattern):

1. **Agent** — `fetchAgentR03Status` → `featureEnabled && eligible` → `mode="agent"` (first wins).
2. **Specialist** — else `fetchSpecialistR06Status` → eligible → `mode="specialist"`.
3. **Business (STORE/COMPANY org owner)** — else `resolveBusinessOwnerClientsEligibility` (`ORG_OWNER` + partner type).
4. **No clients section** — `mode=null` → copy «Раздел «Клиенты» недоступен…».
5. **Employee** — no `OwnerClientsAccessMode`; catalog p.115 exists, gate excludes (page-matrix `EXCLUDED`).

Prototype catalog alignment:

| Catalog page | Role | Expected UX | Branch behavior |
|--------------|------|-------------|-----------------|
| **106** | agent | «Мои клиенты у партнёров» only | PASS: no direction tabs, no receiving panel |
| **107–112** | agent receiving | CRM / scan / purchase / analytics | EXCLUDED: not routed in workspace |
| **79 / 88 / 97** | specialist / store / company | «Клиенты» + directions | PASS: tabs; incoming = blocked receiving |
| **86 / 95 / 104** | observer at partner | subsidiary views | BLOCKED data (`BLK-OBSERVER-REFERRED`) |
| **115** | employee | clients list | NOT in gate → null mode |

## Composition matrix (verified criterion → evidence)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Agent observer-only, no receiving CRM shell | **PASS (component)** | `P6.ClientsDirectionWorkspace.test.tsx` agent case; catalog p.106 |
| Specialist/business: receiving isolated on «Клиенты у меня» | **PASS (component)** | `ca-receiving-appeals-blocked` + `BLK-RECEIVING-APPEALS` |
| No observer fetch while incoming tab mounted | **PASS (component)** | `P6.ClientsDirectionWorkspace.loader-isolation.test.tsx` |
| Observer adapter only after at-partners tab | **PASS (component)** | loader isolation + keyboard integration |
| Single tabpanel mounted | **PASS (component)** | conditional render in workspace; keyboard test |
| Keyboard roving + Arrow/Home/End | **PASS (component)** | `P6.ClientsDirectionTabs.keyboard.test.tsx` |
| Partner **without** clients mode | **PASS (gate contract, not P6 UI)** | `mode=null` in `OwnerClientsGate`; no workspace render |
| Receiving CRM C07–C24 | **BLOCKED** | Honest blocker only; no invented list |
| Observer data C26+ | **BLOCKED** | `fetch-observer-appeals.ts` always `ok:false` |
| Gate loading/error/retry | **NOT_VERIFIED (browser)** | No mocked `/api` browser run this turn |
| Page acceptance / screenshots | **NOT_VERIFIED** | Component tests ≠ pages 79–106 |

## Commands run (this residual pass)

```bash
./node_modules/.bin/vitest run src/components/clients/direction/P6.*.test.tsx \
  src/components/clients/observer/P6.ObserverContractBlocked.test.tsx
# 17/17 PASS after loader-isolation test added

./node_modules/.bin/vitest run src/components/clients/direction/P6.ClientsDirectionWorkspace.loader-isolation.test.tsx
# 3/3 PASS
```

Browser: **NOT_AVAILABLE / NOT_VERIFIED**. Runnable plan for Root QA:

1. Mock `GET /api/agent-r03/status` eligible → open `/clients` → expect no tablist, observer heading.
2. Mock specialist eligible → expect tablist; incoming shows receiving blocker; network must show **no** referred-appeals call until second tab.
3. Mock gate `mode=null` → expect empty copy, no workspace.

## Exact UI gaps (do not claim fixed)

1. **`ObserverPartnersListView`** (foreign owner): when `dataContract.status === "blocked"`, filters/chips/grid chrome remain visible under blocker — misleading vs empty/error distinction.
2. **Receiving tab**: prototype pages 79–85 expect full CRM; UI shows contract inventory only — correct honesty, not publication-ready receiving product.
3. **C04**: direction-level context — **IN_PROGRESS (P6):** observer subtree kept mounted (hidden) after first `at-partners` visit; lazy mount before first visit; reset on `accessMode` change. Filter/disclosure state inside `ObserverPartnersListView` still depends on that subtree not unmounting — full parity **not** until observer owner confirms UI state retention.
4. **Dual eligibility** (agent + specialist APIs true): gate picks **agent** first — document for support, not P6 change.

## Ready for Root to **publish** (narrow)

- Role→direction **routing shell** with honest blockers and keyboard tabs.
- Test package `P6.*` for regression in Root CI selection.

## Unresolved blockers → next owner action

| Blocker | Next action |
|---------|-------------|
| `BLK-RECEIVING-APPEALS` | Backend/API owner: expose `client-appeals*` routes; then receiving workspace owner replaces `ReceivingAppealsBlocked`. |
| `BLK-OBSERVER-REFERRED` | Backend: `referred-appeals`; observer owners wire list/detail. |
| `BLK-OBSERVER-PERSONAL-PERSIST` | No fake save; disable or hide save until API. |
| Blocked observer filters visible | Observer list owner: guard UI when `dataContract.blocked`. |
| Gate E2E | QA: mocked fetch matrix per role. |
| Full section acceptance | **Root only** after contracts + gate E2E; P6 does **not** sign off. |

## Metadata

Prior commit `3753b24c`: Author `karenavedikyan` OK; extra `Co-authored-by: Аведикян Карен` from platform → **BLOCKED_METADATA** (do not chase).
