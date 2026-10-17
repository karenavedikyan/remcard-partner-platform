# R06.2 local acceptance

See `TEST-RESULTS.json` for machine-readable step exit codes.

- **Route/integration/unit:** migration controlled, navigator vitest integration, tsx unit, platform vitest — via `scripts/r06-local-acceptance.mjs`.
- **Browser/BFF:** `scripts/r06-browser-bff.mjs` → `browser-bff.json` (UI + `/api/remcard/...` PATCH/submit, not direct route imports).
- **Visual:** `scripts/r06-visual-pairs.mjs` → `screenshots/manifest.json` (impl/ref pairs; `ok` on capture only, not pixel parity).

Stack: `R06_RUN_DIR=/tmp/r06-r062-v3`, `next build` + `next start`, ports 3055/3056. Set `R06_RUN_DIR` to the run directory written by `scripts/r06-local-stack.mjs`.

**Do not treat `TEST-RESULTS.json ok:true` alone as production release approval.**
