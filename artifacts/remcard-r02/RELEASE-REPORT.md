# RemCard R02.2 RC

## PRs (unchanged branches)

- Backend: https://github.com/karenavedikyan/remcard-navigator/pull/678
- Frontend: https://github.com/karenavedikyan/remcard-partner-platform/pull/12
- Branch: `cursor/r02-agent-profile-b3e3`

## R02.2 scope (6 items)

| # | Item | Result |
|---|------|--------|
| 1 | Gate-off legacy regression | **PASS** — `ProfileEditor` hides legacy basics only when `fetchAgentProfileStatus()` reports `featureEnabled && eligible` and activities are pure agent; gate off keeps full legacy form |
| 2 | Wizard skip + 409 keep-local + in-flight | **PASS** — contacts skip persists step 4; 409 refetches server version; keep-local rebases `expectedVersion`; regression tests in `AgentProfileWizard.regression.test.tsx` |
| 3 | Prefill + mixed contexts | **PASS** — seed fallback `agentWorking* → working* → displayName/city`; `agentContactPhone/Email` isolated from partnership on mixed finish; enable-activity **409** when STORE/SERVICE wallet would flip (`R02_MIXED_WALLET_BOUNDARY`) |
| 4 | Requisites invariants | **PASS** — partial unique indexes (one primary / one apply per owner); legal side reuse + identity mismatch refusal; revise creates new side when INN/kind changes; optional `expectedVersion` on revise |
| 5 | Controlled upgrade | **PASS** — `scripts/lib/__tests__/prof-r02-controlled-apply.integration.test.mjs` on post-R01 disposable fixture (before→apply→after, idempotent, checksum refuse); not substituting db-push EXPECTED_FAIL |
| 6 | Visual + BFF | **PARTIAL** — Playwright pairs attempted (`scripts/r02-profile-visual.mjs`); impl blocked without auth cookie on `/dev/r02-agent-profile`; reference theme selector mismatch on `index.html`. BFF smoke `scripts/r02-profile-bff-smoke.mjs` → **401** (running dev navigator JWT/env not aligned with mint). See `screenshots/visual-report.json`. Production smoke **NOT RUN**. |

## R02 boundary (mixed wallet)

Adding `AGENT` to an owner whose current wallet is STORE/MASTER with STORE/SERVICE activity is rejected in R02 so financial context is not silently rewritten. Mixed owners who already have `AGENT` in activities keep using the separate agent profile block.

## Publication order (unchanged, not executed)

1. Controlled migrate on staging disposable rehearsal.
2. Deploy backend gate off.
3. Deploy frontend.
4. Staging smoke with aligned JWT/consents.
5. Enable gate after sign-off.

See `TEST-RESULTS.json` for commands and exit codes.
