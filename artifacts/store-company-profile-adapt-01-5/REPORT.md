# STORE-COMPANY-PROFILE-ADAPT-01.5 — normal-state fixture capture

## Code vs artifacts

- **Product code (frozen):** `bbbf10f6e5dba4db0ade76251fd59a594e42af37` — no `src/` changes in this delivery.
- **Backend:** `3ab843c7221c60ab7e043b9063eb31e36b0da000` (unchanged).
- **Artifact delivery tip:** `eb6f0bd` (PNG + diagnostics only; product code remains `bbbf10f`).

## Fix applied (capture-time only)

Browser route mocks target BFF paths `/api/remcard/api/pro/...` including **GET /api/pro/partner-taxonomy** with `PartnerTaxonomyResponse` labels for fixture ids `doors`, `plumbing`, `L1-7`.

## Diagnostics summary

- Partner taxonomy intercepts: 10
- Unmocked BFF calls (501): 0
- Console errors: 0
- Interaction: `interaction-log.json`, `visual/store-directions-interaction-hydrated-1440.png`

## PNGs

- **Reshot:** `*-step-2-*`, `*-step-4-*` (STORE/COMPANY × 1440/375/320)
- **Reused from 01-4:** `*-step-1-*`, `*-step-3-*`
