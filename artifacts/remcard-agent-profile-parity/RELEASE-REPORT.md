# Agent profile parity RC (corrective pass — not owner RC)

**Not merge/deploy/production.** R03-PARITY-TAIL waits on full profile RC.

## Git (update after push)

| Repo | Branch | PR |
|------|--------|-----|
| remcard-partner-platform | `cursor/agent-profile-parity-b3e3` | **#19** |
| remcard-navigator | `cursor/agent-profile-parity-b3e3` | **#682** |

**Stack base:** `cursor/r03-ui-parity-b3e3` (#18 / #681).

## This corrective pass

- **Draft discard:** BFF `DELETE` on `/api/pro/agent-profile/draft` only; prof test allowlist; `expectedVersion`+epoch on DELETE; `profileSaved` on GET; wizard cancel/hydrate + basics → overview.
- **Bank:** detail GET for view/copy; copy includes label, legalName, KPP, full accounts; revise label + `expectedVersion`; version check before revise side effects.
- **Migration:** additive `label` column migration + `prof-r02-requisites-label-migrate.mjs` (checksum pinned in TEST-RESULTS).
- **Tests:** proxy/policy regression; wizard cancel tests; navigator route integration (draft DELETE, label detail, revise 409).

## Verification

```bash
# Platform
npm run build
npx vitest run src/lib/profile-sections.test.ts src/lib/remcard-proxy-r02.test.ts \
  src/components/profile/agent/AgentProfileWizard.regression.test.tsx
node scripts/agent-profile-parity-rc.mjs

# Navigator
npm run build
npx vitest run src/lib/__tests__/profTestRoutePolicy.test.ts
# With disposable DB:
PROF_R02_RUN_PG=1 node --test scripts/lib/__tests__/prof-r02-requisites-label-controlled-apply.integration.test.mjs
```

## Evidence remainder (honest)

- **PNG matrix:** `scripts/agent-profile-parity-full.mjs` ready; run failed locally after prod `next start` on 3031/3032 — `GET /api/auth/me` returns `{ user: null }` for fixture-minted token (JWT/env alignment on long-running servers). Earlier probe: stale `next dev` on 3032 returned `Path not allowed` for `/pro/r03/status` until production start.
- **No CAPTURED / pixel PASS** until screenshots land under `artifacts/remcard-agent-profile-parity/screenshots/`.

## Documented capture exceptions

- Test banner on impl; product chrome may be masked per existing r02 visual rules.
