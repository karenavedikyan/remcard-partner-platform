# П1 — full-section assembly (V3 tips)

## HEAD / status

Branch `cursor/remcard-p1-acceptance-20261113`; prof base `57ca4680`; navigator pin `8137ddd1` (object **not** present locally until fetch).

## `clientsSectionPublishable`

**false** until all `fullSectionPublishGatesRequired` in `author-handoff-v6.json` are green.

## Owner tips (`parallelAssemblyTips20261113V4`)

| Owner | Tip | Note |
|-------|-----|------|
| P1 | `ca2221e2…` | direct gate wiring |
| P2 | `ac2d4a7b…` | matrix 8137 — no-schema path blocked |
| P3 | `fe416e2b…` | resolver follow-up **pending** |
| P4 | `eb4592fd` product / `ad7b0824` audit | |
| P5 | `dbbe4455…` | |
| P6 | **`981c72af` only** | `12aea875` **REJECTED** (hooks) |
| P7 | `30a292d0…` | |

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
