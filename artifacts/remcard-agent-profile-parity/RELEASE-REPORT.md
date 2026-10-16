# Agent profile parity RC (visual alignment pass)

**Not merge/deploy/production.** Owner visual sign-off still required (`visualParityOk: false` in E2E JSON).

## Git

| Repo | Branch | PR |
|------|--------|-----|
| remcard-partner-platform | `cursor/agent-profile-parity-b3e3` | **#19** |
| remcard-navigator | `cursor/agent-profile-parity-b3e3` | **#682** |

See `TEST-RESULTS.json` and `profile-parity-e2e.json` for tips after push.

## Evidence status (separate gates)

| Gate | Meaning |
|------|---------|
| `functionalOk` | HTTP + browser cancel/draft flows |
| `captureOk` | **9 impl/ref pairs** (18 base PNG) + layout metrics; bank expanded≠form SHA |
| `visualParityOk` | **false** until owner accepts pixel/layout match |

## Visual changes (this pass)

- Pure-agent profile chrome: 860px guide, heading **Профиль партнёра / Профиль**
- Completed summary: ref-like header, 2-col facts ≥560px, neutral status, actions row + ID
- Bank: inline form (no nested dialog scroll), neutral add, compact action rows
- Dark primary button text `#202329` on accent (ref token)

## Measured residuals (375 overview capture, impl)

From `profile-parity-e2e.json` layout metrics (representative):

- Product shell (top bar + mobile nav) remains on impl only
- Summary card width ~343px inside 860px guide vs ref prototype slice without product nav
- Full-page captures scroll summary off-screen (`summary.y` negative) — use viewport-top supplements for bank form

## Commands

```bash
npm run build
JWT_SECRET=$(openssl rand -base64 32) PROF_R02_RUN_PG=1 node scripts/agent-profile-parity-rc.mjs
```
