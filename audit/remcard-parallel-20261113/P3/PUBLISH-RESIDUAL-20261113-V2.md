# П3 — publication residual (REM-PUBLISH-RESIDUAL-20261113-V2)

**Owner:** П3 — Обзор партнёров и списки  
**Branch:** `cursor/remcard-p3-acceptance-20261113`  
**Base (author candidate):** `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0`  
**Navigator production shell (read-only):** `3c37ca2557069a43544b7d72848fd53c37e3be5e` @ `release/prof-backend-v1-20261007`  
**Prototype:** `3dc31836cd18d9209c20097f18b906dd276f7af6` → `design/general-prototype/partner/client-appeals.js`

## Selected diff (П3 write scope only)

```
ObserverPartnersListView.tsx  — empty/bucket/filter/period, backLabel shell
ObserverFilterChips.tsx     — chip labels + a11y clear
ObserverPartnerCard.tsx     — disclosure aria-expanded (a11y)
P3.*.test.tsx               — component + state + back-label contracts
P3.observer-list-harness.computed.test.tsx — harness metrics (skipped w/o Chromium)
audit/remcard-parallel-20261113/P3/*
```

## Commands / results

```bash
./node_modules/.bin/vitest run \
  src/components/clients/observer/P3.*.test.tsx \
  src/components/clients/observer/ObserverPartnersListView.test.tsx
# 23 passed | 1 skipped (harness — no Playwright binary)
```

## Per-control acceptance (component shell — not page publication)

| Control | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| Search `observer-q` | Placeholder/label match prototype | **PASS** | `P3.ObserverPartnersListView.roundtrip.test.tsx` |
| Period select | `all/30/90` only | **PASS** | roundtrip test |
| Filter chips | Search/period clear + aria-label | **PASS** | `P3.ObserverFilterChips.test.tsx` |
| Filter empty + reset | Copy + `observer:reset-filters`, bucket preserved | **PASS** | `P3.ObserverPartnersListView.states.test.tsx` |
| Bucket empty | active/archived/trash headings | **PASS** | states + roundtrip tests |
| Dataset empty | zero appeals | **PASS** | `ca-observer-empty-dataset` markup |
| Contract blocked | banner + no cards | **PASS** | states test |
| Grouped cards | 4 KPI + disclosure toggle | **PASS** | `P3.ObserverPartnerCard.test.tsx` |
| Layout toggle | partners ↔ flat + filter keep | **PASS** | roundtrip test |
| Selection preserve | flat → client → back | **PASS** | `P3.ObserverPartnersListView.back-label.test.tsx` |
| Back partner drill | «К списку клиентов» → partner page | **PASS** (mock P4) | back-label test |
| Back flat | «К партнёрам» → list shell | **PASS** (mock P4) | back-label test |
| Back grouped card | partner context → partner page | **PASS** (mock P4) | back-label test |
| Back visible text (real detail) | P4 `backLabel` render | **BLOCKED** | baseline detail view; merge `cursor/remcard-p4-acceptance-20261113` |
| Loading shell | workspace fetch spinner | **NOT_OWNER** | `ObserverPartnersWorkspace` (П6) |
| KPI font/grid 20px/4-col | prototype CSS | **NOT_VERIFIED** | harness computed test **skipped** — no Chromium; plan below |
| Disclosure show/hide CSS | dual span toggle | **NOT_VERIFIED** | JSX single label; CSS **П7** |
| Personal persist | save/archive | **BLOCKED** | API contract |
| Referred data | live appeals | **BLOCKED** | API contract |

## Visual / computed evidence

- **NOT_VERIFIED** (this VM): Playwright Chromium missing (`Executable doesn't exist at .../chromium_headless_shell-1148`).
- **Runnable plan (Root or CI with browsers):**
  1. `npx playwright install chromium`
  2. `./node_modules/.bin/vitest run src/components/clients/observer/P3.observer-list-harness.computed.test.tsx`
  3. Artifact: `audit/remcard-parallel-20261113/P3/harness-computed.json` (grid columns @ 1024/375/360, summary height ≥44px)
  4. Optional screenshot: `vite --config scripts/clients-parity-20261113/observer-list-harness/vite.config.ts` @ `127.0.0.1:5377`

## Unresolved for publication (assign Root / other owners)

| Blocker | Owner | Next action |
| --- | --- | --- |
| Client back button visible copy + `ca-clients-back` | **П4** | Merge P4 detail view; re-run integration without mock |
| Observer stats typography/grid breakpoints | **П7** | CSS parity vs `client-appeals.css` `.ca-personal-partners .ca-observer-stats` |
| Direction tab + loading | **П6** | Wire `ObserverPartnersWorkspace` to production gate |
| Personal meta / referred appeals API | **Platform** | No fake persistence |
| Package/page acceptance in navigator `3c37ca25` | **Root** | Cherry-pick П3 owned files only after blockers cleared |

## П3 publication verdict

**Component shell: READY for Root cherry-pick of owned files** (tests 23 PASS, 1 skipped).  
**Page / navigator publication: NOT READY** — blocked on П4 visible back labels, П7 computed CSS, API contracts.
