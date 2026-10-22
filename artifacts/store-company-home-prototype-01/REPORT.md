# STORE-COMPANY-HOME-PROTOTYPE-01

## Base / tips / branches

| Repo | Base | Tip |
|------|------|-----|
| remcard-partner-platform | `1abf5bd8c3890418d7731865c05da05a09e556c7` | `0fb7629acc6e32789311fd8dec1b017ad777b6fd` (+ preview fix pending commit) |
| remcard-navigator | `3ab843c7221c60ab7e043b9063eb31e36b0da000` | `e5f82753491071819327777dc1e35a1da1d2873b` |

Branch (both): `feat/store-company-home-prototype-01`

No PR, merge, deploy, or release refs.

## Reuse

- UI shell: `SpecialistHomeDashboard.module.css`, `PageHeading`, `CabinetShell` on `/`
- Routing gate: `resolveCabinetNavMode` via `shouldRenderBusinessOwnerHome`
- Specialist / legacy / agent paths unchanged (`shouldRenderSpecialistHome`, `HomeDashboard`, agent root redirect)

## Metric map

| UI (STORE) | Source | Filter / scope |
|------------|--------|----------------|
| Продажи сегодня | `GET /api/pro/business-home/metrics` → `Order.count` | MSK calendar day; `buildStoreOrderAccessWhere`; active branch via `getProContextForRequest` + `certificatePartner.branchId`; `needs_branch` if no active branch |
| Партнёры | same | `Partnership` `ACTIVE`, `storeUserId = owner` |
| Мои операции | same | Same access where + `storeUserId = actor` + MSK today |

| UI (COMPANY) | Source | Filter / scope |
|--------------|--------|----------------|
| Филиалы | same | `branch.count` active for org |
| Сотрудники | same | Unique branch employees + org members excluding owner id; no pending invites |
| Партнёры | same | Active partnerships count; hint text from real count |

Backend handler tests: anonymous/forbidden/store owner (`route.test.ts`), MSK bounds (`businessHomeMskPeriod.test.ts`).

## Changed files (frontend)

- `src/app/page.tsx`
- `src/components/home/BusinessOwnerHomeDashboard.tsx`
- `src/lib/business-home/*`
- `src/lib/remcard-proxy.ts`
- `src/app/dev/business-home-preview/page.tsx` (local preview, no production fixture)
- Tests: `gate.test.ts`, `BusinessOwnerHomeDashboard.presentation.test.tsx`

## Changed files (backend)

- `src/app/api/pro/business-home/metrics/route.ts`
- `src/lib/businessHomeMetrics.ts`, `businessHomeMskPeriod.ts`
- `src/lib/profTestRoutePolicy.ts`

## Tests / build

| Command | Result |
|---------|--------|
| Targeted home regressions (4 files) | **17 passed** |
| Navigator new tests (2 files) | **6 passed** |
| `npm run build` (partner-platform) | **OK** |
| Full partner vitest (130 files) | **9 failed** (same baseline class: `ProfileEditor.test.tsx`, `profile-overview-display.test.tsx`; not expanded or hidden) |

## Visual evidence

`artifacts/store-company-home-prototype-01/visual/` — STORE/COMPANY @ 1440/375/320 via `/dev/business-home-preview` with **synthetic** mocked `business-home/metrics` (`asset-diagnostics.json`, `syntheticFixture: true`).

## Limits

- «Мои операции» = count of store-side orders executed by current user today (not wallet / not network-wide sales).
- Sales today require selected active branch; without branch UI shows `needs_branch`, not 0.
- No write endpoints added; no schema/SQL changes.
