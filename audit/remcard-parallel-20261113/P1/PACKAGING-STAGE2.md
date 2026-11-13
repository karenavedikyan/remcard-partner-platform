# П1 — packaging stage 2 (57ca dry-run corrections)

## Rejected manifests

| SHA | Defect |
|-----|--------|
| `e90615aa` | Linear P7 whole-tree sourcing |
| `814df98d` | `productionBundleFromOwnerTips` included stale `new-partner-empty/**` (regresses `clientsEmptyCopy.test.tsx`) |

## PRESERVE_BASE (57ca byte-identical, NOT in bundle)

- `src/components/clients/new-partner-empty/ClientsNewPartnerEmptyState.tsx`
- `src/components/clients/new-partner-empty/clients-new-partner-empty.module.css`
- `src/components/clients/new-partner-empty/clientsEmptyCopy.ts`

Branch copies drop `canLinkOnboardingHistory` / `step.action` / `OnboardingStepItem`. **No** imports from `direction/` / `observer/` / `ClientsListWorkspace`.

## Owner-tip assembly (unchanged pins)

Per-owner tips P1–P7 parallel SHAs in `p1-p7-packaging-manifest.json`.

## QA (separate from production bundle)

- Tests: `qaTestManifest`
- Transitive fixtures: `qaTransitiveFixturesManifest` (`observer-demo-fixtures.ts` @ P3, `audit/.../P5/fixtures.ts` @ P5)
- P7 Playwright: `chromium.launch({ headless: true })` **without** `channel`; uses root sandbox Chromium adapter (no browser download in product deps)

## P1 `ProductionOwnerClientsGate`

`P1.ClientsListWorkspace.compat.test.tsx` asserts **parity-branch source** only. Applied 57ca package uses snippet export **without** cast — not an applied-production test (see `p1SnippetTransformation.paritySourceAssertionNotAppliedProduction`).

## Validate

```bash
python3 audit/remcard-parallel-20261113/P1/validate-owner-assembly.py
```
