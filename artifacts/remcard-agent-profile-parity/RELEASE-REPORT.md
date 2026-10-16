# Agent profile parity RC

**Reviewer acceptance:** `reviewed_with_documented_exceptions` (see `PROFILE-ACCEPTANCE.md`).  
**Code tip:** `ce2921e23785d6383190e34f18fe2d9c8b86f4f4`.  
**Not merge/deploy/production.** `visualParityOk` remains **false** (not universal pixel parity).

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
| `visualReview.status` | `reviewed_with_documented_exceptions` — see JSON + `PROFILE-ACCEPTANCE.md` |

## SHA clarity

- **Code tip (this RC):** `ce2921e…` on branch `cursor/agent-profile-parity-b3e3`.
- **`profile-parity-e2e.json` → `stack.platformGitSha`:** HEAD at stack boot when captures ran (may differ from tip if JSON was not regenerated after the last commit).

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
