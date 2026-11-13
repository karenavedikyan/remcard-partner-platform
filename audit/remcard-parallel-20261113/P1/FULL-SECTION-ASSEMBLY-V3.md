# П1 — full-section assembly (V3 tips)

## HEAD / status

Branch `cursor/remcard-p1-acceptance-20261113`; prof base `57ca4680`; navigator pin `8137ddd1` (object **not** present locally until fetch).

## `clientsSectionPublishable`

**false** until all `fullSectionPublishGatesRequired` in `author-handoff-v6.json` are green.

## Owner tips (reconciled vs 20b93f87 manifest)

| Owner | Tip |
|-------|-----|
| P1 | `c3d7c13d…` (+ owned list shell wiring this commit) |
| P3 | `9c3221adb336f783d173c92a3408af18522aa35c` |
| P4 | `f7198e9d…` / `28aa18ab…` (identical `src/components/clients` delta) |
| P5 | `dbbe44557a42eb354397315b70e1290af490c45c` |
| P6 | `981c72aff23595d32e157dc9642e08c02a0cb70d` |
| P7 | `30a292d002d56e0daaeebdff62d1fce902590362` |

Regenerate: `python3 audit/remcard-parallel-20261113/P1/validate-owner-assembly.py`

## Full-section include / exclude (summary)

**Include (owner-tip extract):** P1 list body + snippet; P3–P7 owned paths; P1-scaffold parity lib + `ObserverPartnersWorkspace`; **not** fixtures.

**Exclude / PRESERVE 57ca:** gate, context, `src/app/clients/*` wiring unchanged; `(cabinet)/clients/**`; vitest; history helper; **three `new-partner-empty` files**; QA fixtures/tests.

**P1 wiring fix:** `ClientsListWorkspace` — direct `OwnerClientsGate` (no `ProductionOwnerClientsGate` cast).

## Cross-owner gaps (not P1)

| ID | Owner | Missing |
|----|-------|---------|
| INT-P2-CONTRACTS | P2 | referred + personal overlay production contracts |
| INT-P3-EXPORTS | P3 | contract/back-label exports for P4 stack |
| INT-P4-DETAIL-MISSING | P4 | `ObserverPartnerDetailMissing` path on 28aa18ab pin |

## Root integration (read-only verify)

```bash
cd remcard-partner-platform
python3 audit/remcard-parallel-20261113/P1/validate-owner-assembly.py
git cat-file -e 9c3221ad:src/components/clients/observer/ObserverPartnersListView.tsx
git cat-file -e 981c72af:src/components/clients/direction/ClientsDirectionTabs.tsx
```

## Page / browser acceptance

**NOT_VERIFIED** this turn (no scoped mocked browser). Component tests ≠ section publication.
