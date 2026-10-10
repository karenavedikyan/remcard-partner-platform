# PROF-I stream B — inbox & bell

**Status:** PASS (targeted unit + coordinator commit)  
**Branches:** `feat/prof-i-inbox` (platform + navigator)

| Repo | SHA | Worktree |
|------|-----|----------|
| remcard-partner-platform | `67943f6` | `/tmp/prof-i-worktrees/prof-i-b-platform` |
| remcard-navigator | `c38b6444` | `/tmp/prof-i-worktrees/prof-i-b-navigator` |

## Tests (navigator)

```bash
cd /tmp/prof-i-worktrees/prof-i-b-navigator && pnpm exec vitest run src/lib/__tests__/profInbox.test.ts
```

2/2 passed.

## Integration for E

- AppShell: see `docs/PROF-I-B-APPSHELL-INTEGRATION.md`
- Payout emit: `docs/PROF-I-B-PAYOUT-EMIT-CONTRACT.md` → `emitProfPayoutRecorded`

## Not in this stream

- Full browser acceptance (integrator E)
- AppShell theme merge (stream A)
