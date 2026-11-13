# П3 — REM-PUBLISH-RESIDUAL-20261113-V2 (integration follow-up)

| | |
|---|---|
| **P3 branch tip** | *(this commit)* |
| **P3 base** | `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0` |
| **P4 detail tip (read-only)** | `effd85f3e7ca8b4ce1a373074e95d975d89cc492` (`cursor/remcard-p4-acceptance-20261113`) |
| **Navigator shell** | `3c37ca2557069a43544b7d72848fd53c37e3be5e` @ `release/prof-backend-v1-20261007` |

## Owned diff selected for Root publish (stack P4 then P3)

| File | Change |
| --- | --- |
| `ObserverPartnersListView.tsx` | `observerClientBackFrom`; pass `backFrom` to P4 `ObserverClientDetailView`; `Shell*DetailMissing` delegates to P4 `*DetailMissing` when exports exist; `initialNav` for synthetic QA only |
| `ObserverPartnerCard.tsx` | (prior) `aria-expanded` on disclosure |
| `ObserverFilterChips.tsx` | (prior) chip a11y |
| `P3.*.test.tsx` | missing shells always; back-label journeys **skip** until P4 slice present |

**Root publish stack (exact):**

1. Cherry-pick / apply **P4** `ObserverClientDetailView.tsx` + `ObserverPartnerDetailView.tsx` from `effd85f3`.
2. Apply **P3** `ObserverPartnersListView.tsx` (this diff).
3. Re-run scoped vitest (below).

## Commands

```bash
# P3-only tip (shell fallbacks; 2 label tests skipped)
./node_modules/.bin/vitest run src/components/clients/observer/P3.*.test.tsx

# After stacking P4 detail files (local verify — agent ran once):
git checkout effd85f3 -- src/components/clients/observer/ObserverClientDetailView.tsx \
  src/components/clients/observer/ObserverPartnerDetailView.tsx
./node_modules/.bin/vitest run src/components/clients/observer/P3.ObserverPartnersListView.back-label.test.tsx
# 5/5 PASS (no skips)
```

See `vitest-p3.log`, `vitest-p3-p4-stacked.log`.

## Per-control acceptance (shell integration — not page publication)

| Control | Status | Evidence |
| --- | --- | --- |
| Invalid `partnerId` → missing page | **PASS** | `P3.ObserverPartnersListView.back-label.test.tsx` (shell/P4) |
| Invalid `clientId` → missing page | **PASS** | same |
| `backFrom=partner-clients` visible label | **PASS when stacked** / **SKIP isolated** | P4 `resolveObserverClientBackLabel` |
| Flat `backFrom=flat-list` + search/selection | **PASS when stacked** | stacked vitest log |
| Partner drill back target | **PASS when stacked** | same |
| Missing shells on baseline without P4 | **PASS** | owned fallback shells (same testids) |
| KPI fonts/grid computed | **NOT_VERIFIED** | Root browser — see below |
| Loading workspace | **NOT_OWNER** | П6 |

## Root browser cases (infrastructure present; egress blocked)

1. Start harness: `vite --config scripts/clients-parity-20261113/observer-list-harness/vite.config.ts` → `http://127.0.0.1:5377`
2. **Grouped journey:** open partner «Бета» → client row → expect `ca-clients-back` text «К списку клиентов» → back → `ca-observer-partner-page`.
3. **Flat journey:** layout «Списком» → select row + type search → open client → expect «Назад к списку» → back → flat layout + preserved query + checkbox.
4. **Invalid hash/nav (optional):** seed `initialNav` not available in harness — use vitest `initialNav` or future deep-link param (П6).
5. **Computed KPI grid:** `npx vitest run src/components/clients/observer/P3.observer-list-harness.computed.test.tsx` with Playwright chromium (Root env).
6. **Mobile overflow:** `npx vitest run src/lib/clients-parity/observer-mobile-navigation.computed.test.ts` (existing suite) with harness up.

## Unresolved → next owner

| Item | Owner | Action |
| --- | --- | --- |
| Package P4 detail + P3 list in one publish commit | **Root** | Order above |
| `ObserverPartnersListView.test.tsx` back regex | **Root/shared** | Update to `ca-clients-back` / «К списку клиентов» after stack |
| CSS KPI 20px / 4-col | **П7** | Unchanged |
| Referred/personal API | **Platform** | BLOCKED |

## Publication verdict

**P3 list wiring: READY** for Root stack with P4 `effd85f3`.  
**Navigator page: NOT READY** until stack lands + browser computed checks.
