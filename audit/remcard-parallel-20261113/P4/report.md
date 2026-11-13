# П4 — Карточки партнёра и клиента (acceptance slice)

## Pin

| Field | Value |
| --- | --- |
| base | `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0` |
| branch | `cursor/remcard-p4-acceptance-20261113` |
| production (read-only) | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| prototype ref | `3dc31836cd18d9209c20097f18b906dd276f7af6` (`partner/client-appeals.js`) |
| productFix (context) | `140de0a83044f324bf455ac2dfb87b17432fb8d1` |

## Changed files (owned)

- `src/components/clients/observer/ObserverPartnerDetailView.tsx`
- `src/components/clients/observer/ObserverClientDetailView.tsx`
- `src/components/clients/observer/P4.ObserverPartnerDetailView.test.tsx`
- `src/components/clients/observer/P4.ObserverClientDetailView.test.tsx`
- `src/components/clients/observer/P4.observer-detail-navigation.test.tsx`
- `audit/remcard-parallel-20261113/P4/report.md`

## Product delta (summary)

- Partner detail: `data-testid="ca-clients-back"`, prototype-style stats sentence, empty-filter message `ca-observer-partner-filter-empty`, region landmark for client rows, long-name head wrapper.
- Client detail: interest header + separate certificate/referral fields, honest `ca-observer-client-timeline-na` (BLK-OBSERVER-REFERRED), partner-missing `ca-observer-partner-unavailable`, optional `backLabel` for shell wiring.

## Tests run

```text
./node_modules/.bin/vitest run \
  src/components/clients/observer/P4.ObserverPartnerDetailView.test.tsx \
  src/components/clients/observer/P4.ObserverClientDetailView.test.tsx \
  src/components/clients/observer/P4.observer-detail-navigation.test.tsx \
  src/components/clients/observer/ObserverPartnerDetailView.test.tsx
```

Result: **11/11 PASS** (4 files).

## Requirement ledger (owned scope)

| ID | Requirement | Status |
| --- | --- | --- |
| C39 | `ca-observer-partner-page` hierarchy, readable KPI, back/open rows | **PASS** (synthetic) |
| C40 | `ca-observer-client-page` fields, unavailable partner, blocked timeline | **PARTIAL** — fields PASS; timeline/purchase **BLOCKED** contract |
| NAV-P4-1 | Grouped partner → client → partner back | **PASS** (`P4.observer-detail-navigation`) |
| NAV-P4-2 | Flat list → client → list back | **PASS** |
| NAV-P4-3 | Partner page empty appeals (filters) | **PASS** |
| NAV-P4-4 | Keyboard back (`Enter` on back control) | **PASS** |
| GEO-V7 | Responsive geometry (281.5 / 47.5px / overflow) | **PASS** (preserved upstream V7; no P4 CSS edits) |
| BR-BROWSER | Playwright mobile breakpoints | **BLOCKED** — no local egress mock harness in P4 write scope |

## Section blockers (unchanged)

- **BLK-OBSERVER-REFERRED**: referred-appeals API/timeline/purchase summary not confirmed; UI states unavailability explicitly (no localStorage/demo save).
- **404 shell**: missing `partnerId` / `clientId` routing handled in `ObserverPartnersListView` (read-only); P4 verified via navigation tests only.

## Cross-owner dependencies

| Owner | Need |
| --- | --- |
| П2/infra | Pass `backLabel` (`← К списку клиентов` / `← К партнёрам`) from `ObserverPartnersListView` nav state |
| П5 | Personal alias/tag/note on client detail (prototype sections) when personal overlay is confirmed |
| П7 | Optional dedicated client-page typography if `partnerPageHead` reuse is insufficient at 320px |
| API | Wire real `ObserverAppealsLoadResult` so C39/C40 matrix leaves BLOCKED |

## Remaining work

1. Shell: wire contextual `backLabel` on `ObserverClientDetailView`.
2. When contract unblocks: public timeline list + purchase summary row (prototype `renderObserverClientPage`).
3. Browser matrix 320–1024 on detail pages (depends on shared computed runner / П7).
4. Commit tip: `6c74deb2f1d9a5fe2fc3cecdfabba919f5a61300`.
