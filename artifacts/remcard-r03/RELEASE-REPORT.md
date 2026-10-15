# RemCard R03 FINAL-3 — Release Report

## Verdict: **READY_FOR_PUBLICATION**

FINAL-3 closes the three remaining acceptance items on existing PRs [#15](https://github.com/karenavedikyan/remcard-partner-platform/pull/15) / [#680](https://github.com/karenavedikyan/remcard-navigator/pull/680). No merge, deploy, production connect, or gate publication.

## Code refs (after FINAL-3 commit — see `TEST-RESULTS.json` for exact SHAs)

| Repo | Branch | Base |
|------|--------|------|
| remcard-partner-platform | `cursor/r03-agent-clients-certs-b3e3` | `release/prof-v1-20261007` |
| remcard-navigator | `cursor/r03-agent-clients-certs-b3e3` | `release/prof-backend-v1-20261007` |

Baseline before this turn: platform `7704489b`, navigator `251ec8bb`.

## FINAL-3 scope (only)

### 1. Integrated agent shell + list toolbar

- Admin-test stack enables `PROF_R01_AGENT_NAV_ENABLED` + `PROF_R03_AGENT_CERTIFICATES_ENABLED`; stale stack without R01 is restarted on the same ports (3040/3041).
- `AgentAppShell` + `resolveAgentDesktopNavKeys`: desktop **Сертификаты / Клиенты** first; mobile defaults include certificates + **Ещё** (`data-testid="mobile-nav-more"`).
- Shared `AgentR03ListToolbar`: search, **Показывать**, list/cards toggle, found count, select-page row (frozen order; no demo finance panels).

### 2. Honest visual pairs

- `scripts/lib/r03-prototype-ref.mjs`: agent role → cabinet → **nav:home** (certificates) / **nav:clients**; list/cards via `data-coll-action`; ref driven at 1440 then resized; ThemeToggle for dark impl/ref.
- **8 verified matched pairs** + **1** single 320 smoke — see `visual-report.md` and `local-acceptance-report.json` (`visualPairCount: 8`).

### 3. E2E path + gate-OFF

- Admin → test-agent → R02 profile; **Сертификаты/Клиенты via real nav**; client create/rename-only; certificate **UI form** (partnership seed `scripts/r03AcceptancePartnerSeed.ts`); detail alias + test-owner public restriction; batch archive/restore; reload + admin return/re-enter alias; BFF idempotency retry.
- **Gate OFF:** navigator restart with `PROF_R03_AGENT_CERTIFICATES_ENABLED=false`, BFF `featureEnabled: false`, `/certificates` blocked, `/recommendations` legacy path OK; stack restored to R03 on.

## Flags / eligibility (admin-test 3040/3041)

From last acceptance: `pilotActive: true`, `permittedKeys` includes `certificates` + `clients`, `mobileNavKeys`: certificates, partners, wallet, profile. Secrets not logged.

## Commands (last green run)

```bash
# stack (if needed): ADMIN_TEST_PLATFORM_PORT=3040 ADMIN_TEST_BACKEND_PORT=3041 JWT_SECRET=… DATABASE_URL=… node scripts/admin-test-local-stack.mjs
JWT_SECRET=… DATABASE_URL=… ADMIN_TEST_PLATFORM_PORT=3040 node scripts/r03-local-acceptance.mjs  # exit 0
cd remcard-partner-platform && pnpm build && pnpm exec vitest run … # see TEST-RESULTS.json
cd remcard-navigator && pnpm build
```

## Evidence

- `artifacts/remcard-r03/local-acceptance-report.json` — `ok: true`, `failures: []`
- `artifacts/remcard-r03/visual-report.md` — 8 pairs + 1 single
- `artifacts/remcard-r03/visual/impl-*` / `ref-*`

## Preserved from R03.2-CLOSE

BFF 200, client action set, contact opt-in, test-owner exclusion on client add, migration guards — not re-audited.

## Out of scope

R02-LIVE-UI #14, R04/R05, staff/branches/notifications/Tandoor, merge/deploy/production.
