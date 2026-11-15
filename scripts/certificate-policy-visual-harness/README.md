# Certificate policy visual harness (local fixtures only)

**Label:** `LOCAL FIXTURE — certificate-policy-visual-harness · no backend / no orders / no messenger`

## Run (after applying the frontend patch)

Harness lives at `scripts/certificate-policy-visual-harness/` under the platform root. `@` resolves to `../../src` (patched production tree). Next.js modules use checked-in `stubs/`; `globals.css` uses `src/app/globals.css` when present, else `shims/globals.css`.

```bash
cd /path/to/remcard-partner-platform
npx vite --config scripts/certificate-policy-visual-harness/vite.config.ts
```

Open `http://127.0.0.1:5207` — viewport 1440×900, 1440×600, 375×812 for Root review.

Scenes: general settings, individual pending, agent incoming-only, profile entry, public catalog chips, issued dark card with frozen per-recipient policies.

## Apply

Copy `scripts/certificate-policy-visual-harness/` from this artifact into the repository after applying the frontend patch.