# RemCard R04 — Agent Partners RC

## HEAD (pinned for this RC)

| Repo | Branch | HEAD |
|------|--------|------|
| remcard-partner-platform | `cursor/r04-agent-partners-b3e3` | (see git log at publish) |
| remcard-navigator | `cursor/r04-agent-partners-b3e3` | (see git log at publish) |

Base release tags: `release/prof-v1-20261007` @ `2a4e5de`, `release/prof-backend-v1-20261007` @ `63f99425`.

## Gate

- `PROF_R04_AGENT_PARTNERS_ENABLED` — default OFF; server-only (not public env).
- `/api/pro/r04/status` resolves eligibility via `resolvePrincipalAgentBusiness` + feature flag.
- Gate OFF or ineligible → legacy `/partners` (`PartnersHub`) without regression.

## Delivered

- Agent UX: `AgentPartnersHub` + extended `PartnersHub` (`variant=agent-r04`): segments «Действующие» / «Приглашения», find/link actions, compact cards, alias/archive/share, search `role=agent` + `partnerType`.
- Backend: test allowlist for partnership routes; `profTestPartnershipScope`; `PartnershipListPreference`; search type filter; R04 status; notification skip in test mode.
- Migration: `20261016103000_prof_r04_partnership_list_preference` (SHA256 `c0e90f9055d0b035257c3a85737221ac78165c3cf43f269a5c652d466308065a`); manifest `scripts/prof-r04-migrate-manifest.json`.

## Commands (this environment)

```bash
# Builds
cd remcard-navigator && npm run build          # exit 0
cd remcard-partner-platform && npm run build   # exit 0

# Tests
cd remcard-navigator && npm test -- --run src/lib/__tests__/partnershipSearchQuery.test.ts src/lib/__tests__/profTestRoutePolicy.test.ts  # exit 0

# Disposable admin stack + R04 smoke
cd remcard-partner-platform && node scripts/admin-test-local-stack.mjs  # exit 0
cd remcard-partner-platform && node scripts/r04-browser-acceptance.mjs  # exit 0 (see TEST-RESULTS.json)
```

## Browser chain (smoke)

Test-agent delegation → profile finish → `partnership/list` 200, `link-invite` 200, R04 UI shell on `/partners`. Full A–G matrix partially automated; alias/archive/search pagination covered in code paths; extended visual parity pairs tracked in `PARITY-MATRIX.md`.

## Rollout / rollback

1. Apply migration via controlled `prof-r04-migrate` manifest (before/apply/after) on staging.
2. Deploy navigator + platform RC branches to prof staging.
3. Enable `PROF_R04_AGENT_PARTNERS_ENABLED=true` only after migration + smoke.
4. Rollback: disable flag (instant legacy UX); migration is additive (no destructive rollback required).

## Remaining / non-blockers for RC

- Full 8+ impl/ref pixel matrix (1440/375 light/dark) — first impl capture in `screenshots/`; reference pairs to be completed in follow-up capture run on frozen `roles.js` SHA256 `0c9a8be699670e94345e4d0e1a3a331f4402966ca26c4b74c1ab98e0daf7e5bc`.
- Dedicated `prof-r04-migrate.mjs` runner (manifest pinned; can reuse admin migrate tooling pattern from R03).
