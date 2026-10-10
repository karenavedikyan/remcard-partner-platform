# PROF-I integration — READY_FOR_OPERATOR_CHECK

**Date:** 2026-10-10  
**Branch:** `feat/prof-i-integration` (both repos)

## Integration SHAs (after subagent tip reconciliation)

| Repository | SHA |
|------------|-----|
| remcard-partner-platform | `db3ebc7` |
| remcard-navigator | `edde090c` |

All feature tips (`feat/prof-i-{theme,inbox,team-permissions,payouts}`) are ancestors of these integration commits.

## Stream SHAs (feature branches, origin)

| Stream | Platform | Navigator |
|--------|----------|-----------|
| A theme | `395f61a` / impl `8639c5e` | — |
| B inbox | `01dd8e1` | `d5caef7a` |
| C team/permissions | `495f1cf` | `79869023` |
| D payouts | `830acc6` | `59c08d5b` |

Stream B browser smoke + screenshots: `scripts/prof-i-b-notifications-browser.mjs`, `docs/screenshots/prof-i-b/` (on `feat/prof-i-inbox`, merged into integration).

## Migrations (apply in order on loopback `remcard_prof_test` only)

1. `20261013_prof_i_b_inbox_dedupe_key`
2. `20261014_prof_i_c_01_granular_permissions`
3. `20261015_prof_i_d_bonus_payout_record`

## Automated checks (integration worktree)

| Check | Result |
|-------|--------|
| Platform `npm run test:proxy` | **233/233 PASS** |
| Platform `npm run test:component` | **124/124 PASS** (incl. `prof-notifications`, theme) |
| Platform `npm run build` | **PASS** (prior run) |
| Navigator `pnpm exec tsc --noEmit` (integration) | **PASS** |
| Navigator PG `profIInbox.integration.test.ts` | **NOT RUN** on integration (loopback DB + fixtures) |
| Cross-feature browser (theme + bell + team + payout) | **NOT RUN** on integration |
| Production deploy / Timeweb / Yandex Maps | **NOT VERIFIED** |

## Parallel executors (Cursor Task)

| Stream | Agent ID |
|--------|----------|
| A | `bc-6677d555-68ff-562c-8f58-e28c0be3ab03` |
| B | `bc-f29c95f4-0c0a-5b18-b3ef-b35685c42f1b` |
| C | `bc-68c6b93e-5d5b-5d1d-a5d4-b2da09f9e224` |
| C platform UI | `bc-8f3aa42b-ebb8-5bd0-a784-75526969bead` |
| D | `bc-c0bc0345-141a-532c-8fee-242103e04f5f` |

## Operator follow-up

1. Apply migrations on staging DB; run one browser path: theme toggle + bell + team invite wizard + record payout (mock).
2. Confirm `emitProfPayoutRecorded` dedupe on retry.
3. No PR/release merge from this package unless explicitly requested.
