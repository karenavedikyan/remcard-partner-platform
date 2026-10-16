# Agent profile parity RC (evidence pass)

**Not merge/deploy/production.** R03-PARITY-TAIL remains queued until owner accepts this RC.

## Git

| Repo | Branch | Tip | PR |
|------|--------|-----|-----|
| remcard-partner-platform | `cursor/agent-profile-parity-b3e3` | `a94d672ecb1a36801592feab3801ed977678a314` | **#19** |
| remcard-navigator | `cursor/agent-profile-parity-b3e3` | `7a47405f9dbcaa4a6b1c4bdbed77ac8a155b64d7` | **#682** |

Structured E2E: `profile-parity-e2e.json` · gate: `TEST-RESULTS.json` (`ok: true`, 18 PNG).

## Verification commands

```bash
# Platform (disposable DB + JWT for E2E)
cd remcard-partner-platform
npm run build
JWT_SECRET=$(openssl rand -base64 32) node scripts/agent-profile-parity-rc.mjs

# Navigator migration (disposable DB)
cd remcard-navigator
PROF_R02_RUN_PG=1 node --test scripts/lib/__tests__/prof-r02-requisites-label-controlled-apply.integration.test.mjs
```

## Evidence (this pass)

- **Unit:** 20 vitest (sections, proxy, wizard cancel, requisites copy + panel).
- **HTTP:** draft save/discard, masked list + authorized detail, bank create (parity runner).
- **Browser:** overview→edit→cancel; basics→cancel→overview; dirty confirm reject/accept; saved draft reload→cancel (confirm on discard dirty draft).
- **Visual:** 9 scenarios × impl+ref PNG at 1440/375 light/dark + 320 smoke; reference from `/opt/cursor/artifacts/remcard-reference-20261014/.../remcard-profile-wizard`.
- **Theme:** `data-theme` + surface luma assertions (not `classList.dark`).

## Visual honesty

Pairs are **structural comparisons**, not pixel PASS:

- Impl includes RemCard product shell (top bar, mobile nav); reference is prototype cabinet slice.
- Impl may show test-user banner when present; reference hides demo chrome via documented CSS in runner only on ref side.
- Typography, spacing, and color tokens differ; dark mode pairs share theme intent but not identical hex/luma.

## Capture exceptions (documented)

- Reference runner hides `.demo-top`, `.review-details`, etc. on ref captures only.
- Full-page screenshots include page chrome where applicable.
