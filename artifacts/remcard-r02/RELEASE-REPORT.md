# RemCard R02.1 corrective RC

## PRs (same branches)

- Backend: https://github.com/karenavedikyan/remcard-navigator/pull/678 (`cursor/r02-agent-profile-b3e3`)
- Frontend: https://github.com/karenavedikyan/remcard-partner-platform/pull/12 (`cursor/r02-agent-profile-b3e3`)

## R02.1 fixes (vs first RC)

| Area | Fix |
|------|-----|
| A Client | `remcardFetch` receives plain objects; regression test on BFF body serialization |
| A Server | Rejects string/double-encoded JSON bodies (`parseJsonObjectBody`) |
| B Activation | New `POST /api/pro/agent-profile/enable-activity` with owner/staff guards; legacy `agent-activate` untouched |
| C Draft/finish | Partial draft save vs step advance validation; epoch+version lock; finish requires expectedVersion/epoch; no public displayName/city; agent-specific saved fields |
| C UI | Save draft, skip persists step, 409 keep-local choice, pure agent hides legacy basics form |
| D Requisites | legalSideId model, revise/edit/archive UI, corrAccount, field validation, DB snapshot immutability test |
| E Migration | `connectionString` guard before connect; checksum mismatch refused; expanded schema verify |
| E Dev | `/dev/r02-agent-profile` returns 404 in production build path via `notFound()` |

## Publication order (controlled, not executed here)

1. Apply backend migration on staging via `node scripts/prof-r02-migrate.mjs before|apply|after` (loopback guard on disposable; staging uses ops URLs).
2. Deploy backend with `PROF_R02_AGENT_PROFILE_ENABLED=0`.
3. Deploy frontend proxy/UI.
4. Staging smoke: gate off legacy → enable activity (owner) → draft/resume/finish → requisites revise.
5. Rollback: disable gate; additive schema remains.

## Verification summary

See `TEST-RESULTS.json`. Route integration **PASS** on disposable `remcard_r01_test`. Visual pairs **NOT VERIFIED** this iteration. Production smoke **NOT RUN**.
