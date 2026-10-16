# Agent profile parity RC

**Not merge/deploy/production.** Dimensions and functional/state gates accepted; owner PNG sign-off tracked separately (`visualReview`).

## Git

| Repo | Branch | PR |
|------|--------|-----|
| remcard-partner-platform | `cursor/agent-profile-parity-b3e3` | **#19** |
| remcard-navigator | `cursor/agent-profile-parity-b3e3` | **#682** (backend unchanged) |

## Gates (latest RC)

| Gate | Meaning |
|------|---------|
| `functionalOk` | HTTP + browser flows |
| `captureOk` | impl/ref PNG pairs + viewport-top supplements |
| `geometryOk` | 1440 overview summary/bank **widths** Δ≤4px |
| `cssOk` | Mobile summary badge content-sized; pure-agent tab divider present |
| `visualParityOk` | **false** — not a universal pixel pass |
| `visualReview.status` | `pending_owner_signoff` — see `documentedExceptions` in JSON |

## Documented visual exceptions (not geometry failures)

- Longer product PageHeading intro vs ref demo copy (~46px top offset at 375).
- No demo success banner/footnote on impl; heights differ legitimately.
- Real user IDs vs ref demo IDs.

## Commands

```bash
npm run build
JWT_SECRET=$(openssl rand -base64 32) node scripts/agent-profile-parity-rc.mjs
```

Artifacts: `profile-parity-e2e.json`, `screenshots/`.
