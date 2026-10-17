# R06-SPECIALIST-01 / R06.3 — RELEASE-REPORT

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

Controlled path: `remcard-navigator/scripts/r06-migration-controlled.mjs` + `scripts/lib/prof-r06-controlled-apply.mjs` (ledger SQL apply, before/apply/after, pinned checksums both migrations, loopback DB guard). **Not** `prisma db push` as apply.

## R06.3 visual acceptance tail — closed this pass

1. **Catalog CSS:** scoped `--cw-*` fields/buttons in `SpecialistCatalogWizard.module.css`; primary uses `btn` + `btnPrimary`; Playwright asserts input border/padding/min-height and primary visibility/background on step 0 (no masks).
2. **Specialization desktop:** full-width profile/catalog columns (hide aside for specialist basics/catalog); working wizard uses non-compact direction grids; layout width assert ≥520px card.
3. **Completed summary:** contacts with empty fallbacks, directions chips, «Хотите появиться в каталоге?» + «Перейти к каталогу».
4. **Pending:** dedicated `SpecialistCatalogPendingView` from real `PENDING` status (no wizard step 0 / duplicate badges).
5. **Preview evidence:** matched synthetic `Krasnodar` + UI advance on impl/ref; manifest **7 matched pairs + 1 impl-only smoke** (320px).
6. **Migration negatives:** strict expected codes; ledger probe fails on missing fixture or guard bypass; unit regression in `prof-r06-migration-negative-runner.test.mjs`.

**Local acceptance (2026-10-17):** `R06_RUN_DIR=/tmp/r06-r063-v2`, `node scripts/r06-local-acceptance.mjs` → `{"ok":true}`. Runtime/capture SHA **7d24c6b** (platform) / **04613f09** (navigator). Ref **771cc658a415a5d05b964f29f675d32db449198b**.

## R06.3 acceptance blockers — prior pass

1. **Migration verifier:** `catalogNavigatorStageIds` `NOT NULL` + default `{}`; partial guard; ledger checksum negative with ROLLBACK.
2. **409:** conflict resolution gating + Vitest regression.
3. **Runners:** step-by-step catalog advance; scoped selectors; ref prototype state asserts.

### Visual pairs (ref `771cc658…`)

| State | Impl | Ref |
|-------|------|-----|
| completed 1440 light | `screenshots/profile-completed-summary-impl-1440-light.png` | `…-ref-1440-light.png` |
| specialization `#sp-kind` 1440 light | `…/profile-specialization-step-impl-1440-light.png` | `…-ref-1440-light.png` |
| catalog step 0 1440/375 light, 375 dark | `…/profile-catalog-wizard-impl-*` | `…-ref-*` |
| preview step 4 375 light | `…/profile-catalog-preview-impl-375-light.png` | `…-ref-375-light.png` |
| pending 1440 light | `…/profile-catalog-pending-impl-1440-light.png` | `…-ref-1440-light.png` |
| smoke 320 light | `…/profile-catalog-wizard-smoke-impl-320-light.png` | — |

Manifest: `artifacts/remcard-r06-specialist/screenshots/manifest.json`

## R06.3 — earlier items

1. **409 conflict:** local draft preserved; panel «Загрузить серверную версию» / «Оставить мои правки» (no silent hydrate overwrite). Vitest regression added.
2. **Catalog layout:** `SpecialistCatalogWizard.module.css` — prototype-style horizontal steps, wide card, footer actions; not agent sidebar layout.
3. **Specialization picker:** compact scrollable grids in `ProfileDirectionsPicker` specialist mode.
4. **Origin policy:** strict `appConfig.appUrl`; optional `REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN=1` for loopback-only dev stacks (same host+scheme).
5. **Browser BFF:** UI catalog fill/save/clear/preview/submit; finish→edit without reload; origin 403 negative; migration negatives script.
6. **Visual runner:** immutable ref archive SHA `771cc658…`, state assertions, fail-closed ref capture, scroll-top before shot.
7. **Migration:** typed `after` probes, untracked partial schema guard, CLI modes `before|apply|after|full`, `r06-migration-negatives.mjs`.

## Taxonomy auto-add (still open)

Navigator stores stages/trades as stable IDs in existing tables. Free-text “propose option” has **no** safe mapping today: ad-hoc alias rows would need `(tenant, normalized_text) → id` with dedup, ordering policy, and moderation — absent that, auto-add would create duplicate labels or wrong stage order on legacy repairs. **Minimal safe path:** product-owned `ProposedTaxonomyAlias` (independent UUID, normalized key, status pending/approved, optional approved_target_id) — not implemented in R06.3.

## R06.2 — addressed earlier

1. **409 after finish → edit:** `SpecialistWorkingProfileWizard` re-fetches draft on finish (version reset) and before «Редактировать профиль»; 409 triggers hydrate + user message. Regression: `SpecialistWorkingProfileWizard.version.test.tsx`.
2. **Summary/review labels:** `display-labels.ts` maps preset kinds and direction IDs; `other` shows custom `specialistTitle`.
3. **Browser/BFF chain:** `scripts/r06-browser-bff.mjs` — Playwright UI finish → edit/save/reload → catalog → PATCH/submit → pending GET; CSRF 403 probe; artifact `browser-bff.json`.
4. **Stack/capture:** `r06-local-stack.mjs` — kill ports, `next build` + `next start`, separate `R06_NEXT_DIST_DIR`, controlled migration; BFF origin allows request `Host` when public URL port differs.
5. **Visual pairs:** `scripts/r06-visual-pairs.mjs` — wait loaded wizard (no loader), fonts, app theme; impl `-impl-` PNGs; ref from frozen prototype cabinet+specialist (`roles.html`); manifest lists `codeSha` / `captureSha` / `referenceSha` separately. **Pixel parity not auto-scored.**
6. **Controlled migration:** real SQL + ledger; checksum mismatch / reapply covered in runner (local disposable DB only).

## Still open (owner decision)

- **Taxonomy auto-add:** not implemented — **no general release GO** for taxonomy. Blocker: no safe idempotent mapping from ad-hoc text to stable navigator stage/trade IDs without a product-owned pipeline (`ProposedTaxonomyAlias`-style).
- **Disposable DB drift:** if `catalogNavigatorStageIds` was created nullable before pinned `NOT NULL` migration, ledger may show applied while `after` fails until the column is aligned to pinned SQL (local test DB required one-time `SET NOT NULL`).

## Out of scope

No merge, deploy, production DB/flags, or registration deploy continuation.

## Branches

`cursor/r06-specialist-profile-catalog-b3e3` (both repos)
