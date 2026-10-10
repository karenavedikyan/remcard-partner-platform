# PROF-I parallel workstreams (coordinator)

Frozen runtime bases (do not use docs branch as runtime):
- Platform: `2c752e32728b6f147e865bfd1175e20f708a3ddf`
- Navigator: `e7d1fd6c3e2ae1b33210d8ccb73280551f146b22`
- Docs handoff (read-only): commit `8872685fcbf4f363b5da3f6d5b4da88346e2caae` on `docs/prof-i-parallel-handoff`

Prototype extraction (shared read-only):
- Run: `node /tmp/prof-i-worktrees/extract-prototype-blocks.mjs /tmp/prof-i-reference/prototype`
- Orchestrator + series: `git -C /agent/repos/remcard-partner-platform show 8872685:docs/prof-i/PROF-I-PARALLEL-ORCHESTRATOR.md`

| Stream | Branch | Platform worktree | Navigator worktree | Dev port (platform) | Test PG port | DB name |
|--------|--------|-------------------|--------------------|---------------------|--------------|---------|
| A theme/shell | `feat/prof-i-theme` | `/tmp/prof-i-worktrees/prof-i-a-platform` | — | 3101 | — (no new DB) | — |
| B inbox | `feat/prof-i-inbox` | `/tmp/prof-i-worktrees/prof-i-b-platform` | `/tmp/prof-i-worktrees/prof-i-b-navigator` | 3102 | 54322 | `remcard_prof_test` |
| C team/permissions | `feat/prof-i-team-permissions` | `/tmp/prof-i-worktrees/prof-i-c-platform` | `/tmp/prof-i-worktrees/prof-i-c-navigator` | 3103 | 54323 | `remcard_prof_test` |
| D payouts (after C) | `feat/prof-i-payouts` | TBD from C pair | TBD | 3104 | 54324 | `remcard_prof_test` |
| E integration | `feat/prof-i-integration` | coordinator merge | coordinator merge | 3100 | 54320 | `remcard_prof_test` |

Isolation rules:
- Each worker: own `.next`, `npm ci` + `prisma generate` in that worktree only.
- Do not `killall node`, delete sibling `.next`, or reset another stream's database.
- Migration prefixes: `20261012_prof_i_a_*`, `20261013_prof_i_b_*`, `20261014_prof_i_c_*`, `20261015_prof_i_d_*`.

Shared merge ownership (integration E only): `prisma/schema.prisma`, BFF allowlist, shared types, AppShell (A theme + B bell), permission helpers (C), payout routes (D).

Coordinator checkout (reports only): `/agent/repos/remcard-partner-platform` on `feat/prof-h-profile-redesign` — no worker writes here.
