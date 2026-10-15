# RemCard R03 — scoped fix (dark pair + certificate sort)

## Verdict (this run): **READY_FOR_REVIEW** for the two items below only

PRs [#15](https://github.com/karenavedikyan/remcard-partner-platform/pull/15) / [#680](https://github.com/karenavedikyan/remcard-navigator/pull/680). Full 1:1 visual parity with frozen reference is **not** claimed.

## Code refs

| Repo | Branch | HEAD (after this fix) | Base |
|------|--------|------------------------|------|
| remcard-partner-platform | `cursor/r03-agent-clients-certs-b3e3` | see `TEST-RESULTS.json` | `release/prof-v1-20261007` |
| remcard-navigator | `cursor/r03-agent-clients-certs-b3e3` | see `TEST-RESULTS.json` | `release/prof-backend-v1-20261007` |

## 1. Dark pair — **FIXED / VERIFIED**

- Reference driver: `[data-action="theme"]` on frozen `remcard-profile-wizard` (was wrong selector).
- `assertDarkTheme`: opaque cabinet surface + explicit theme; transparent `html` no longer false PASS (regression tests in `src/lib/r03-theme-assert.test.ts`).
- Re-capture: `impl/ref-certificates-list-375-dark.png` @ 375×812; both measured dark (see `local-acceptance-report.json` → `themeEvidence`).

## 2. Certificate sort — **FIXED**

- **Decision:** use existing `Certificate.updatedAt` for `updated_desc` (no migration); distinct from `created_desc`.
- Default certificate list sort: **`created_desc`** («Сначала новые»); stale/unknown query → `created_desc`.
- Client `updated_desc` → `AgentClient.updatedAt` unchanged.
- Tests: `src/lib/__tests__/agentR03ListQuery.test.ts`.

## Commands (this run)

```bash
pnpm exec vitest run src/lib/r03-theme-assert.test.ts src/lib/__tests__/agentR03ListQuery.test.ts
pnpm build  # both repos
R03_ONLY_DARK_PAIR=1 node scripts/r03-local-acceptance.mjs  # exit 0
```

## Out of scope (unchanged)

Other UI/control deltas from FINAL-4; R02-LIVE-UI #14; R04/R05; staff/branches/notifications/Tandoor.
