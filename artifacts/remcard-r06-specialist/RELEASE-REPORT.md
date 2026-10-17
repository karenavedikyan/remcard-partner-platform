# R06-SPECIALIST-01 — RELEASE-REPORT

## Bases (verified at branch creation)

| Repo | Base branch | Base SHA |
|------|-------------|----------|
| remcard-partner-platform | `release/prof-v1-20261007` | `0fe7da52bb02f2a515d238757c8be16ef2d83948` |
| remcard-navigator | `release/prof-backend-v1-20261007` | `8bfdb19343121baadfd9e22bfc12391004fba56e` |

**Frozen UI reference:** `771cc658a415a5d05b964f29f675d32db449198b` (`docs/reference/registration-20261017/`)

**Feature gate:** `PROF_R06_SPECIALIST_PROFILE_ENABLED` (default off)

**Contract:** `2026-10-17.r06.1`

## Migration

- `prisma/migrations/20261017123000_prof_r06_specialist_profile/migration.sql`
- **Checksum (SHA-256):** `66ab4be91d68130812f721dd2c60e0f191e529fdb32473a5bf28d4fddaf1cfdc`
- Table: `SpecialistWorkingProfileDraft` (working profile server draft)

## Delivered

- Navigator: R06 status, specialist working draft/finish APIs, eligibility, presets, catalog submit validation (services + stages + public contact when gate on), catalog draft JSON fields `navigatorStageIds` / `catalogTouched`.
- Platform: 4-step working profile wizard, 5-step public catalog wizard (gate + MASTER owner), prefill allowlist + touched, legacy basics hidden when R06 active.

## Out of scope / honest gaps

- Full 1440/375/320 visual PNG matrix vs frozen reference not captured in this pass (no local stack screenshot runner executed).
- Taxonomy “propose new option” auto-add API not added (existing IDs/presets only).
- Public catalog `navigatorStageIds` live in `catalogDraft` / `catalogUnderReview` JSON; no new User column on approve (stages not promoted to live columns yet).
- No merge, deploy, production DB, or flags change.

## PR branches

`cursor/r06-specialist-profile-catalog-b3e3` (both repos)
