# V6-COMPUTER-RESULTS — pin EXACT `78e48521`

## Pins (authoritative)

| Role | SHA |
|---|---|
| **implCandidateSha (EXACT)** | `78e4852194a0b9d307ee92743ae754dd18d5a9ba` |
| Product fix parent | `5063368aea4a4219df354b0fcad7a0eaf9846ac8` |
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| Packaging base (must remain verbatim) | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Prior V5 auditor tip (does **not** cover V6) | `42f9fae9…` |
| Later tip `0729c12f` | **not** the Computer-accepted impl pin |

Computer extracted pure component + final CSS only — **no** whole-branch production transfer.

## Independent auditor replay (this pass)

Harness: `scripts/clients-parity-20261113/observer-list-harness` @ `78e48521`  
Script: `scripts/clients-parity-20261113/audit-v6-78e48521-real-clicks.mjs`  
Report: `v6-pin-78e48521/v6-78e48521-real-click-report.json`

| Check | Result |
|---|---|
| 8 samples 320/360/375/768 × light/dark | **PASS** |
| partner-page → client → back | **PASS** (real click) |
| expanded group → client → back | **PASS** |
| flat list → client → back | **PASS** |
| open button height | **47.5px** |
| 375 dark open width | **315px** (was 0 on `d1da9484`) |
| edit/cancel discards alias draft (all 8) | **PASS** |
| Save disabled (not persistence) | **PASS** |
| LIVE resize 1440→1024→768→375→360→320→1440 KPI both themes | **4/4/4/4/2/2/4 PASS** |
| Component `ObserverPartnersListView` + `ObserverPartnerDetailView` | **2 files / 8 tests PASS** |

Child bounds / `boundingBox` + `gridTemplateColumns` used; `scrollWidth` alone is **not** a pass.

## Acceptance scope (narrow)

Accepted **only** these isolated regressions:

1. Mobile/tablet personal client-row geometry + real click navigation
2. V5 KPI cascade (375 four, ≤360 two, 768 four)

**Not** accepted:

- Full visual / prototype pixel parity
- Receiving-side completion
- Server `referred-appeals` / personal-overlay contracts
- Full C01–C56 section acceptance / publication

## Packaging (still FAIL for delivery)

Vs EXACT `57ca4680`, tip still diverges:

- `OwnerClientsGate.tsx`, `OwnerClientsModeContext.tsx`
- `src/app/(cabinet)/clients/page.tsx` (route move)
- `src/lib/onboarding-step/**` (helper deleted)
- `vitest.config.ts`

Stale whole-branch transfer remains **forbidden**. Selected-file cherry-pick only — see `20-V6-SELECTED-FILE-MANIFEST.md`.
