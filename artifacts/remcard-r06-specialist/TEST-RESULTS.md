# R06 TEST-RESULTS

## Unit / node tests (navigator)

```bash
cd remcard-navigator
pnpm exec tsx --test src/lib/__tests__/profR06Config.test.ts src/lib/__tests__/specialistR06CatalogSubmit.test.ts
```

**Exit code:** 0  
**Pass:** 6 tests (profR06Config, eligibility helper, validateR06SpecialistCatalogSubmit)

## Platform build

```bash
cd remcard-partner-platform
pnpm run build
```

**Exit code:** 0

## Local API acceptance

```bash
cd remcard-partner-platform
node scripts/r06-local-acceptance.mjs
```

**Exit code:** 0 (skipped — `R06_RUN_DIR` not set; no disposable stack in this run)

**Artifact:** `artifacts/remcard-r06-specialist/TEST-RESULTS.json`

## Visual (1440/375/320)

Not run in this pass — see RELEASE-REPORT gaps.
