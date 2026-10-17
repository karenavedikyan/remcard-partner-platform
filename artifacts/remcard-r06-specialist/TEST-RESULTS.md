# R06.1 local acceptance

**Result:** `ok: true` (no skipped steps)

## Commands

```bash
# Stack (loopback DB remcard_r01_test, ports 3043/3044 example)
R06_RUN_DIR=/tmp/r06-local-stack-fresh R06_NAV_PORT=3043 R06_PLATFORM_PORT=3044 \
  node scripts/r06-local-stack.mjs

# Full acceptance (migration + integration + unit + build + Playwright PNG)
R06_RUN_DIR=/tmp/r06-local-stack-fresh node scripts/r06-local-acceptance.mjs
```

Without `R06_RUN_DIR`, `r06-local-acceptance.mjs` exits non-zero (no skip-as-pass).

## Steps (see TEST-RESULTS.json for exit codes)

| Step | Tool |
|------|------|
| migrationControlled | `remcard-navigator/scripts/r06-migration-controlled.mjs` |
| integrationVitest | `profR06SpecialistRoute.integration.test.ts` (7 tests) |
| unitTsx | `profR06Config`, `specialistR06CatalogSubmit`, `specialistProfileDraft` |
| platformBuild | `pnpm run build` |
| visualCapture | `scripts/r06-visual-capture.mjs` → 6 PNG + manifest |

## Visual captures

Reference SHA: `771cc658a415a5d05b964f29f675d32db449198b`

Screenshots under `screenshots/` (1440/375 light basics+catalog, 375 dark catalog, 320 smoke). Pixel parity vs frozen reference not automated; captures taken from local stack with fixture user `r06-local-specialist-v1`.

## Honest limits

- Primary API proof is vitest integration (route handlers), not browser BFF PATCH/finish chain.
- Taxonomy auto-add still not implemented (see RELEASE-REPORT).
