# RemCard R04 — Agent Partners RC (NO-GO remediation)

## HEAD (update after push)

| Repo | Branch | HEAD |
|------|--------|------|
| remcard-partner-platform | `cursor/r04-agent-partners-b3e3` | see `TEST-RESULTS.json` → `platformHead` |
| remcard-navigator | `cursor/r04-agent-partners-b3e3` | see `TEST-RESULTS.json` → `navigatorHead` |

Review tips: platform `7ed2756`, navigator `fb9078c4` (base); RC commits extend both branches.

## Scope closed (A–E)

- **A** Collection UX: list/cards toggle, list search, compact specialization/stage filters, chips, archive selector, sort, SVG row actions; toolbar outside empty-results branch.
- **B** Filters/archive without dead-end; working stage/specialization fields on list API; honest partner type; deterministic sort on full in-memory list.
- **C** Share text strips contract/alias/notes; action error banner + retry; partial preference PATCH.
- **D** Bidirectional test/real guards; link-invite accept realm check; public test link hides terms; agent invite categories; term-change POST in test allowlist.
- **E** `scripts/prof-r04-migrate.mjs` before/apply/after + integration test on disposable DB.

## Acceptance

| Layer | Artifact | Notes |
|-------|----------|--------|
| Functional | `TEST-RESULTS.json` → `functional` | Disposable admin stack, BFF chain, migrate |
| Captured | `TEST-RESULTS.json` → `captured` + `screenshots/` | Browser runner impl shots |
| Geometry | `PARITY-VISUAL.json` | Toolbar/list bounds, 320 smoke |
| Visual review | `PARITY-MATRIX.md` | 8 impl/ref + 320 smoke |

```bash
cd remcard-partner-platform && npm run build
cd remcard-navigator && npm run build
cd remcard-navigator && pnpm vitest run src/lib/__tests__/profTestPartnershipScope.test.ts src/lib/__tests__/profTestRoutePolicy.test.ts
cd remcard-partner-platform && npx vitest run src/lib/agent-r04/partner-filters.test.ts
set -a && source /tmp/admin-test-local-stack/runtime.env && set +a
cd remcard-navigator && node --test scripts/lib/__tests__/prof-r04-migrate.integration.test.mjs
cd remcard-partner-platform && node scripts/r04-browser-acceptance.mjs
cd remcard-partner-platform && node scripts/r04-ui-parity-visual.mjs
```

No merge, deploy, production DB push, or R05.
