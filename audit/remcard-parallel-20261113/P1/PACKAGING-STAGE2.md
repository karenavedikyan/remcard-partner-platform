# П1 — packaging manifest stage 2 (read-only)

## Anchors

| | SHA |
|---|-----|
| Packaging base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Combined product content | `9280f9e7279da14964574a6d1585499134ac7f8c` (P7) |
| P1 tip | `c3d7c13d16a065a2733a989a43fd3915fb0e5e63` |
| Prototype (read-only) | `3dc31836cd18d9209c20097f18b906dd276f7af6` — catalog readable |

Machine-readable manifest: **`p1-p7-packaging-manifest.json`** (64 paths scanned, **30** in production bundle set).

## P1 scoped tests (this branch)

```
npm run test:component -- src/components/clients/P1.*.compat.test.tsx
```

**9 tests PASS** — log: `vitest-run-stage2.log`

## Combined bundle (safe selected files @ P7)

Pull file **content** from `9280f9e7` for paths with `packaging: include*` in JSON. Do **not** whole-branch merge.

Notable **last-touch agents** on combined tip:

| Area | Last agent SHA |
|------|----------------|
| List shell + parity lib scaffold | P1 `c3d7c13d` |
| List/partner navigation | P4 `dd76accf` |
| Detail views / personal rows | P5 `c265ba69` |
| Direction tabs / receiving blocked | P7 `9280f9e7` (also touched P6) |
| `observer.module.css` | P7 `9280f9e7` (≠ isolated `140de0a8` pin alone) |

`ClientDetailWorkspace.tsx` — **omit** (no delta vs 57ca).

## BLOCKED — never silent-include

| ID | Item |
|----|------|
| BLK-GATE-API | `OwnerClientsGate.tsx` @ branch (R5 client fetch gate) |
| BLK-CONTEXT-HISTORY | `OwnerClientsModeContext.tsx` drops `useOwnerClientsCanLinkOnboardingHistory` |
| BLK-CABINET-ROUTES | `src/app/(cabinet)/clients/**` |
| BLK-VITEST | `vitest.config.ts` branch delta |
| BLK-HISTORY-TEST | Do not delete `ClientsListWorkspace.history-prop.test.tsx` from 57ca |
| BLK-P1-TESTS | P1 compat tests exist on **P1 tip only**; dropped at P2+ |

## Section blockers (unchanged)

Referred appeals contract, personal overlay persistence, receiving appeals backend, full C01–C56 — **BLOCKED**. UI 120+22 P7 checks ≠ production acceptance.

## Git author note

Prior P1 commits retain Cursor Agent author (history not rewritten). New commits attempt `karenavedikyan` + single `Co-authored-by: Perplexity` trailer — see commit metadata on tip after push.
