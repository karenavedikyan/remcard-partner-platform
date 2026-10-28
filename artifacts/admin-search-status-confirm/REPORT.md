# Admin partner search visibility — confirm without manual reason

## Branch and boundaries

| Item | Value |
|------|--------|
| Branch | `feat/admin-search-status-confirm-20261028` |
| Base (published frontend) | `7443ac29ce8bab27b318f4dccb83ff011abaa531` |
| Product + tests commit | see git log (`feat(admin): …`) |
| QA harness + capture | see git log (`chore(qa): …`) |

No production deploy, no backend/API contract changes, no OPTOVIK data changes.

## Change summary

- Single-partner actions `show_partner_search`, `hide_partner_search`, `reset_partner_search`: no manual reason on the path; server preview → confirm/cancel unchanged.
- On apply, audit reason is auto-generated in Russian via `autoPartnerSearchLifecycleReason` (not empty, not reused from catalog text).
- Catalog/archive actions and bulk lifecycle unchanged — manual reason still required.
- UI: search block with three buttons + confirm dialog (partner name + mode); separate «Каталог и архив» section with reason textarea.

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run src/app/admin/partners/` | PASS (86 tests) |
| `npm run test:proxy` | PASS (295) |
| Admin + auth/consent vitest subset | PASS (144) |
| `npm run build` | PASS |
| Harness capture `npm run harness:search-status-confirm:capture` | PASS — preview/cancel/apply 1440+375 light/dark; catalog without reason blocked |

Real production admin session and live messenger delivery were **not** exercised.

## Key files

- `src/app/admin/partners/partnerSearchControl.ts` — `isPartnerSearchLifecycleAction`, `autoPartnerSearchLifecycleReason`
- `src/app/admin/partners/AdminPartnersClient.tsx` — preview/apply reason gating
- `src/app/admin/partners/AdminPartnersSingleManagementPanel.tsx` — split search vs catalog UI
- `src/app/admin/partners/AdminPartnersSearchControl.test.tsx`, `partnerSearchControl.test.ts`
- `artifacts/admin-search-status-confirm/FLOWS.md`
- `scripts/admin-search-status-confirm-capture.mjs`, harness `mocks/partners-api.ts`

## Harness honesty

Capture uses isolated Vite harness @ `127.0.0.1:5199` and synthetic registry; apply mock validates auto audit text for search actions only.
