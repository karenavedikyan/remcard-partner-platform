# Agent profile parity RC (measured visual tail)

**Not merge/deploy/production.** Geometry gate passes at 1440; owner may still review PNG pairs before R03-PARITY-TAIL.

## Git

| Repo | Branch | PR |
|------|--------|-----|
| remcard-partner-platform | `cursor/agent-profile-parity-b3e3` | **#19** |
| remcard-navigator | `cursor/agent-profile-parity-b3e3` | **#682** (backend unchanged `7a47405f`) |

Platform tip for this evidence: build from branch after visual-tail commits (see `TEST-RESULTS.json` / `profile-parity-e2e.json` shas).

## Evidence gates (2026-10-16)

| Gate | Result |
|------|--------|
| `functionalOk` | **true** — HTTP draft/bank + browser cancel/draft flows (basics cancel asserts URL before reload) |
| `captureOk` | **true** — impl/ref PNG pairs + viewport-top supplements |
| `geometryOk` | **true** — at **1440** overview: `summaryWidthDelta` **0**, `bankWidthDelta` **0** (document coords, scroll 0) |
| `visualParityOk` | **true** — geometry gate only; demo banner/footnote and real user IDs excluded from pixel diff |

## Measured layout @ 1440 (overview-complete, light)

| Region | impl | ref |
|--------|------|-----|
| `[data-testid="pw-summary"]` width | 564px | 564px |
| `[data-testid="bank-panel"]` width | 1096px | 1096px |
| Summary x | 559 | 559 |
| Bank x | 293 | 293 |
| `bankRecords` | 1 | 1 |

Removed 860px profile guide; pure-agent chrome uses **1096px** inner column (ref `1160px` content − padding). Summary sits in shrink-wrapped `.pw` (centered); bank panel is full column width (`max-width: none`).

## Visual tail fixes

- Summary status sibling of identity block (ref `.pw-summary-header` / `.pw-status` responsive rules)
- Agent overview grid: tabpanel-like stack; bank flat list selectors; primary actions before detail; «Дополнительные действия» for secondary ops
- Form: type selector outside two-column grid; empty-state intro only when `records=0`
- INN parity: `PARITY_SYNTH.bank.inn` **770708389301**; expanded detail asserts `bank-detail-inn`
- Runner: `bank-record` count, scroll 0, geometry assert, wizard bank count 0, re-seed bank after wizard capture

## Commands

```bash
npm run build
npx vitest run src/lib/profile-sections.test.ts src/lib/remcard-proxy-r02.test.ts \
  src/lib/agent-profile/format-requisites-copy.test.ts \
  src/components/profile/agent/AgentProfileWizard.regression.test.tsx \
  src/components/profile/agent/AgentPayoutRequisitesPanel.test.tsx
JWT_SECRET=$(openssl rand -base64 32) node scripts/agent-profile-parity-rc.mjs
```

Artifacts: `artifacts/remcard-agent-profile-parity/screenshots/` (impl/ref pairs).
