# STORE-COMPANY-PARTNERS-01

**Status: READY FOR REVIEW**

## Reuse map (minimal business delta)

| Existing surface | Business delta |
| --- | --- |
| `/partners/page.tsx` | Fetch `/api/pro/context`; pass business eligibility into presentation resolver |
| `resolvePartnersHubPresentation` | After R04/R06 gates: `business-store-r04` / `business-company-r04` → `shared-r04` shell, eyebrow «Магазин»/«Компания», no `defaultSearchRole: "agent"` |
| `AgentPartnersHub` → `PartnersHub` (`variant="agent-r04"`) | Unchanged wiring; `presentationAudience` drives copy only |
| `partnersSharedUiCopy` | `BUSINESS_COPY` (same UX tone as specialist, without program labels) |
| `resolveBusinessOwnerPartnersEligibility` (new) | `shouldRenderBusinessOwnerHome` + `proContext.role === "ORG_OWNER"` |
| Partnership APIs / proxy | **No contract changes** |
| Backend navigator | **Unchanged product code**; isolated seed clears store↔company partnerships before gate |

No `StorePartnersHub`, no parallel APIs, no forced agent search role.

## Runtime SHAs (application)

| Repo | Branch | Application SHA (runtime) | Published base |
| --- | --- | --- | --- |
| remcard-partner-platform | `feat/store-company-partners-01` | `54a2b07d…` (see `metadata-shell.json`) | `020918dff2aad929e88de5f07f43445f30080577` |
| remcard-navigator | `feat/store-company-partners-01` | `eee39348251c2f562ee287b21b9f2e364fb1afb6` | `2b1bac4fbe31e2d686b4a2655d89d0bf7cf9847d` |

Evidence capture (single gate run): see `shell-gate.json` / `metadata-shell.json` — `captureStartedAt` `2026-10-25T12:34:16.000Z`, `captureCompletedAt` `2026-10-25T12:36:17.009Z`.

## Owner / actor / capabilities (frontend)

- **Eligibility for shared business shell:** PRO with cabinet mode `business-store` / `business-company` (`resolveCabinetNavMode`) **and** `GET /api/pro/context` → `role === "ORG_OWNER"`.
- **Priority:** R04 eligible → agent shell; else R06 eligible → specialist shell; else business owner → business shell; else legacy `PartnersHub`.
- **Search role:** business paths omit `defaultSearchRole` prop → `PartnersHub` uses `defaultSearchRoleForUser` (store side → `role=store`, company org owner → `role=pro`).
- **API permissions unchanged:** UI audience is not authorization; invite/accept/patch remain server-side.

## Tests and gate

| Command | Exit |
| --- | --- |
| `pnpm exec vitest run src/lib/partners-hub-presentation.test.ts src/lib/business-partners/gate.test.ts` | 0 |
| `pnpm exec tsc --noEmit` | 0 |
| `bash scripts/store-company-partners-01/run-browser-gate.sh` | 0 (`shell-browser-gate.exit`) |

### Delegated prof-test (read + policy negative)

- STORE/COMPANY delegation tokens: `/partners` shared hub, `data-partners-audience` `business-store-r04` / `business-company-r04`.
- `GET /api/partnership/list` 200; `GET /api/partnership/search?role=…` 200 with synthetic prof-test discovery rows.
- `PATCH /api/partnership/nonexistent-partnership-id` `{ action: "cancel" }` → 403/404 (foreign write deny).
- **Note:** `POST /api/partnership/invite` remains on the existing prof-test allowlist; this gate does **not** treat delegated invite as full owner flow.

### Ordinary owners (`isProfTestUser: false`, real JWT)

- Store owner: hub + modal search UI trigger; API search `q=Synthetic company`; `POST /api/partnership/invite` to company owner (or idempotent «уже существует»).
- Company owner: `PATCH` `{ action: "accept" }` on `INVITED` (or skip if already `ACTIVE`); reciprocal search API.
- Screenshots: `artifacts/store-company-partners-01/visual-shell/*` (desktop 1440, mobile 390/320, light/dark).

## Backend delta

Only `scripts/prof-admin-moderation-isolated/seed-business-owner-real-sessions.ts`: delete store↔company partnerships before harness write (gate isolation). No schema/migrations/routes.
