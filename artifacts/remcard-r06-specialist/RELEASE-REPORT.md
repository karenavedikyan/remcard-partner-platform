# R06-SPECIALIST-01 / R06.1 — RELEASE-REPORT

## PRs

- Platform: https://github.com/karenavedikyan/remcard-partner-platform/pull/27
- Navigator: https://github.com/karenavedikyan/remcard-navigator/pull/690

**Frozen UI reference:** `771cc658a415a5d05b964f29f675d32db449198b` (`docs/reference/registration-20261017/`)

**Feature gate:** `PROF_R06_SPECIALIST_PROFILE_ENABLED` (default off)

**Contract:** `2026-10-17.r06.1`

## Migrations (pinned checksum)

| Migration | SHA-256 |
|-----------|---------|
| `20261017123000_prof_r06_specialist_profile/migration.sql` | `66ab4be91d68130812f721dd2c60e0f191e529fdb32473a5bf28d4fddaf1cfdc` |
| `20261017140000_prof_r06_1_specialist_fields/migration.sql` | `1edc45e087aabb9c397a69672ef2e5669bb6654ba3ad50fbb5ad281cf77d0589` |

Controlled disposable path: `remcard-navigator/scripts/r06-migration-controlled.mjs` (loopback DB only).

## R06.1 closed blockers

1. **Catalog draft for unpublished specialists** — `buildCatalogDraftUpdate` always uses JSON draft when not live public; stages/touched via `catalogNavigatorStageIds`; approve maps `navigatorStageIds` → `catalogNavigatorStageIds` on User.
2. **Specialist picker** — `specialistMode` on directions picker: services + stages editable; products hidden; server rejects store categories / invalid trade IDs for catalog submit.
3. **Working vs public identity** — finish persists working fields + `specialistKind` / `specialistTitle` / work contacts; no live `displayName`/`city` writes; summary UI without forced reload.
4. **Eligibility & PATCH contract** — COMPANY/STORE/org owner/staff blocked; AGENT-only MASTER blocked; finish does not force `partnerType`; `navigatorStageIds` PATCH stays working; catalog stages use `catalogNavigatorStageIds`.
5. **Tab-independent R06 gate** — server + client status fetch on profile mount; direct `/profile?section=catalog` consistent.
6. **Working profile UX/validation** — save/skip, work mode, site/Telegram, phone/email validation, valid service IDs on submit.
7. **Local acceptance + PNG** — stack + `r06-local-acceptance.mjs` (no skip-as-pass); Playwright captures under `artifacts/remcard-r06-specialist/screenshots/`.
8. **Migration runner** — pinned checksum + post-apply schema probe in controlled script.
9. **Regressions** — gate-off draft 403; AGENT-only status ineligible (integration).

## Out of scope / remaining gaps

- **Taxonomy “propose new option” auto-add:** not implemented. Blocker: no safe, idempotent mapping from free-text proposals to navigator stage/trade IDs without product-owned taxonomy pipeline (would risk duplicate or wrong-order stages). R06 uses existing IDs/presets only.
- **Pixel-perfect visual diff** vs frozen reference: not automated; PNG pairs are runtime captures only.
- **Browser E2E** through platform BFF for full PATCH/finish/reload chain: integration tests cover API routes; stack JWT cookie path used for screenshots only.
- No merge, deploy, production DB/flags, or registration deploy continuation.

## Branches

`cursor/r06-specialist-profile-catalog-b3e3` (both repos)
