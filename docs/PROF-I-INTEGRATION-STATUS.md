# PROF-I integration — READY_FOR_OPERATOR_CHECK

**Date:** 2026-10-10  
**Branch:** `feat/prof-i-integration` (both repos)

## Integration SHAs

| Repository | SHA |
|------------|-----|
| remcard-partner-platform | `c415231` (after merge A–D + bell wiring) |
| remcard-navigator | `d58b3f03` |

## Stream SHAs (feature branches, pushed)

| Stream | Platform | Navigator |
|--------|----------|-----------|
| A theme | `8639c5e` (`feat/prof-i-theme`) | — |
| B inbox | `663924d` (`feat/prof-i-inbox`) | `c38b6444` |
| C team/permissions | `a4f36d8` (`feat/prof-i-team-permissions`) | `ef11d03b` (+ contract `d71c0aac`) |
| D payouts | `dbade10` (`feat/prof-i-payouts`) | `6b96a9ad` |

## Migrations (apply in order on loopback `remcard_prof_test` only)

1. `20261013_prof_i_b_inbox_dedupe_key`
2. `20261014_prof_i_c_01_granular_permissions`
3. `20261015_prof_i_d_bonus_payout_record`

## Automated checks (integration worktree)

| Check | Result |
|-------|--------|
| Platform `npm run test:proxy` | **233/233 PASS** |
| Platform `npm run test:component` | **122/122 PASS** |
| Platform `npm run build` | **PASS** |
| Navigator `bonusPayout` unit (stream D worktree) | **2/2 PASS** |
| Navigator full vitest inbox suite in E worktree | **NOT RUN** (vitest/rolldown parse error on test entry — operator may run `profIInbox.integration.test.ts` with loopback DB) |
| Cross-feature browser acceptance | **NOT RUN** (no dual-server browser in this agent pass) |
| Production deploy / Timeweb / Yandex Maps | **NOT VERIFIED** |

## Parallel executors (Cursor Task)

| Stream | Agent ID |
|--------|----------|
| A | `bc-6677d555-68ff-562c-8f58-e28c0be3ab03` |
| B | `bc-f29c95f4-0c0a-5b18-b3ef-b35685c42f1b` |
| C | `bc-68c6b93e-5d5b-5d1d-a5d4-b2da09f9e224` |
| C platform finish | `bc-8f3aa42b-ebb8-5bd0-a784-75526969bead` |
| D | `bc-c0bc0345-141a-532c-8fee-242103e04f5f` |

## Isolation

Worktrees under `/tmp/prof-i-worktrees/` — see `WORKSTREAMS.md`. Docs handoff commit `8872685fcbf4f363b5da3f6d5b4da88346e2caae`; prototype blocks at `/tmp/prof-i-reference/prototype/`.

## Operator follow-up

1. Apply migrations on staging DB; run one browser path: theme toggle + bell + team invite wizard + record payout (mock).
2. Confirm `emitProfPayoutRecorded` dedupe on retry.
3. No PR/release merge from this package unless explicitly requested.
