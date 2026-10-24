# TEST-CATALOG-ISOLATED-ACCEPTANCE-01 (frontend / BFF)

Branch: `fix/test-catalog-full-cycle-01`. **Runtime code SHA:** `8d686357d0148fa8e0326829cdf515ac89e116c5`.

## Harness

| Script | Purpose |
|--------|---------|
| `scripts/catalog-qa-isolated/start.sh` | production Next on **3400**, `REMCARD_API_BASE_URL=http://127.0.0.1:3401` |
| `scripts/catalog-qa-isolated/run-e2e.sh` | headless Playwright screenshots (1440 / 390) via `run-e2e.mjs` |

Requires navigator isolated PG + backend/frontend `start.sh`. **`NEXT_PUBLIC_APP_URL`** must be set at **build** time to `http://127.0.0.1:3400`.

Full lifecycle UI: `seed-ui-harness.sh` (navigator) then `run-ui-harness.sh` (real clicks, not pre-approved fixture-only).

## E2E (agent VM)

```bash
# navigator: bootstrap + start + seed-e2e-fixture.sh
cd remcard-partner-platform && ./scripts/catalog-qa-isolated/run-e2e.sh  # exit 0
```

Artifacts: `artifacts/test-catalog-isolated-acceptance/partner-public-1440.png`, `partner-public-390.png` (public card with `data-testid=public-test-partner-badge`).

## Not production release

Same gate as backend REPORT.
