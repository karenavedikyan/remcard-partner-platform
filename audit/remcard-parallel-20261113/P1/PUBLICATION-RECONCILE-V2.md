# П1 — REM-PUBLISH-RESIDUAL-20261113-V2

## SHA anchors

| Role | SHA |
|------|-----|
| P1 branch tip (packaging owner) | *(after commit below)* |
| Prof clients packaging **base** | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Navigator release pin (preserve shell) | `3c37ca2557069a43544b7d72848fd53c37e3be5e` |
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |

**P7 final tip:** `30a292d002d56e0daaeebdff62d1fce902590362` (`observer.module.css` blob `bd13e20f…`, was `d96d026f…` @ `9280f9e7`).

**Remote note:** `release/prof-backend-v1-20261007` ref not on origin fetch; SHA object resolves locally.

## Verdict

**`clientsSectionPublishable`: false** — only a bounded **UI-only** subset may be root-cherry-picked onto **57ca**; whole «Клиенты» remains **BLOCKED**.

## Owner tips reconciled (unchanged except P7)

P1 `c3d7c13d` · P2 `e0063d15` · P3 `8af6b6cb` · P4 `dd76accf` · P5 `c265ba69` · P6 `3753b24c` · P7 `30a292d0` · P8 `803b45e8`

## Commands / evidence

```bash
python3 audit/remcard-parallel-20261113/P1/validate-owner-assembly.py
# PASS — log: validate-owner-assembly.log

npm run test:component -- src/components/clients/P1.*.compat.test.tsx
# packaging wiring only (NOT page acceptance)
```

**Browser:** NOT_VERIFIED (no bounded mocked browser run in this turn). P7 layout tests need sandbox Chromium per `p7QaRuntimeRequirements`.

## Deployable package (independent UI atop 57ca)

**27 paths** — see `publicationReconcileV2.deployableIndependentUiOnly.paths` in `p1-p7-packaging-manifest.json`.

- **Partial:** `ClientsListWorkspace.tsx` — body from P1 tip; **export** from snippet on 57ca only.
- **Runtime blocker file (ship only with honest UI):** `fetch-observer-appeals.ts`.

## Forbidden in publication package

- **PRESERVE_BASE:** three `new-partner-empty/**` files (57ca blobs).
- **Gate/context/routes/config:** `OwnerClientsGate`, `OwnerClientsModeContext`, `(cabinet)/clients/**`, `history-link-eligibility`, `vitest.config.ts`.
- **QA-only:** `observer-demo-fixtures.ts`, `audit/.../P5/fixtures.ts`, all `qaTestManifest` / P-prefix tests.

## Missing acceptance (per proposed UI package)

| ID | Next action owner |
|----|-------------------|
| AC-REFERRED-API | Backend: referred appeals contract before any `ok:true` fetch |
| AC-PERSONAL-PERSIST | Backend: personal overlay mapping; until then save/archive stay disabled |
| AC-RECEIVING-APPEALS | Product/backend: receiving CRM explicitly out of agent scope |
| AC-FULL-LEDGER | Root audit: C01–C56 ledger |
| AC-ONBOARDING-LINKS | Root packaging: keep 57ca empty-state trio |
| AC-GATE-CONTEXT | Root packaging: never replace 57ca gate/context |

## Root next action

1. Cherry-pick **only** `deployableIndependentUiOnly` blobs from owner tips (manifest `ownerRootAssembly` + blobs).
2. Keep navigator `3c37ca25` shell fixes separate from prof clients 57ca base.
3. Do **not** publish whole branch; do **not** treat P1–P7 component tests as section acceptance.
