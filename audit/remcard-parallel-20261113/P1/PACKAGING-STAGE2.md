# П1 — packaging stage 2 (corrected owner-tip assembly)

## Rejected

`e90615aa` used linear last-touch to `combinedProductContentTip=P7` and **dropped reviewed fixes** (e.g. P6 tabs −51 vs P7, P3 list view −41 vs P4/P7).

## Model

- **Base:** `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79`
- **Assembly:** byte-extract each path from **reviewed owner tip** (parallel branches), not P7 whole tree.
- **Artifact:** `p1-p7-packaging-manifest.json` (`ownerRootAssembly`, `qaTestManifest` separate).
- **Validator:** `validate-owner-assembly.py` (fails old P4/P7 ownership heuristics).

## Corrected examples (git blob)

| Path | Owner | Source SHA | `matchesP7WholeTree` |
|------|-------|------------|----------------------|
| `ClientsDirectionTabs.tsx` | P6 | `3753b24c5273a8d83b68ab88a06f0ebe6c38547c` | **false** |
| `ObserverPartnersListView.tsx` | P3 | `8af6b6cbe5c3e70a0f79932b62d3f78f09ff5543` | **false** |
| `observer.module.css` | P7 | `9280f9e7279da14964574a6d1585499134ac7f8c` | true (sole P7 product owner) |

## P1 snippet (separate from list body blob)

On `57ca4680`, apply `patch-ClientsListWorkspace-57ca4680.snippet.txt` for export only; list **body** from P1 tip `c3d7c13d`.

## QA tests

Listed in manifest `qaTestManifest` per owner tip — not folded into production bundle.

## Git author

New commits: author `karenavedikyan`; report **BLOCKED** if platform appends extra `Co-authored-by` after Perplexity.
