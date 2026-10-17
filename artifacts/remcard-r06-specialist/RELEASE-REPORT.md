# R06-SPECIALIST-01 / R06.2 — RELEASE-REPORT

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

## R06.2 — addressed in this pass

1. **409 after finish → edit:** `SpecialistWorkingProfileWizard` re-fetches draft on finish (version reset) and before «Редактировать профиль»; 409 triggers hydrate + user message. Regression: `SpecialistWorkingProfileWizard.version.test.tsx`.
2. **Summary/review labels:** `display-labels.ts` maps preset kinds and direction IDs; `other` shows custom `specialistTitle`.
3. **Browser/BFF chain:** `scripts/r06-browser-bff.mjs` — Playwright UI finish → edit/save/reload → catalog → PATCH/submit → pending GET; CSRF 403 probe; artifact `browser-bff.json`.
4. **Stack/capture:** `r06-local-stack.mjs` — kill ports, `next build` + `next start`, separate `R06_NEXT_DIST_DIR`, controlled migration; BFF origin allows request `Host` when public URL port differs.
5. **Visual pairs:** `scripts/r06-visual-pairs.mjs` — wait loaded wizard (no loader), fonts, app theme; impl `-impl-` PNGs; ref from frozen prototype cabinet+specialist (`roles.html`); manifest lists `codeSha` / `captureSha` / `referenceSha` separately. **Pixel parity not auto-scored.**
6. **Controlled migration:** real SQL + ledger; checksum mismatch / reapply covered in runner (local disposable DB only).

## Still open (owner decision)

- **Taxonomy auto-add for free-text proposals:** not implemented. Blocker: no safe idempotent mapping from ad-hoc text to stable navigator stage/trade IDs without a product-owned taxonomy pipeline (risk of duplicate IDs, wrong order, retroactive stage changes). R06 continues to use existing preset/direction IDs only.

## Out of scope

No merge, deploy, production DB/flags, or registration deploy continuation.

## Branches

`cursor/r06-specialist-profile-catalog-b3e3` (both repos)
