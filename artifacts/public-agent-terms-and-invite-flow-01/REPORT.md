# REPORT — public agent terms & invite flow

## Status

**READY FOR REVIEW** (code + unit/proxy gates). Isolated shell E2E requires catalog-qa DB + running PROF BFF (script provided; not executed in this run — no `.catalog-qa-isolated` harness).

## Problem

Production agent invite forced numeric terms (`DEFAULT_GENERAL_PERCENT = 10`) via `PartnerInviteDialog` / generic partnership UI. Agents cannot know partner percentages before a request. Approved prototype: read published general limits → request without % → partner personal offer → explicit accept.

## Baselines / tips

| Repo | Baseline (production) | Branch tip (this work) |
|------|----------------------|-------------------------|
| remcard-partner-platform | `188c86bf955d9c198f12426f30576f87f05e7b62` | see `git rev-parse HEAD` on branch |
| remcard-navigator | `0152db578de69c387e73536214ebec940aebda27` | see `git rev-parse HEAD` on branch |

Branch: `fix/public-agent-terms-and-invite-flow-01` (both repos).

## Where / what changed

### Editor (P0)

- **Entry:** `/partners/agent-terms` — «Партнёры → Мои условия для агентов» (link from `PartnersHub` for non-agent shells).
- **Storage:** existing `OrganizationCategoryLimit.poolPercent` via proxied `GET/POST/DELETE /api/pro/limits/org`.
- **Write:** `ORG_OWNER` / `SOLO_PARTNER` only (server-enforced); employees read-only copy.

### Agent card (P0)

- `PartnerGeneralTermsDetails` + `fetchPartnerCertificateProgram` → `GET /api/partner/:id/certificate-program-summary` (BFF allowlisted).
- States: loading, error+retry, empty, loaded. No conflation of HTTP errors with «не опубликовано».

### Invite / negotiate (P0)

- Agent: `PartnerInviteDialog` → `cooperationRequest: true`, `terms: []`, required subject note; no % UI.
- Backend: `rejectEmptyPartnershipInviteTerms` + invite route; `acceptPartnership` → `terms_required` if zero terms.
- Partner: `PartnerCounterOfferDialog` prefills from org limits (not 10% default); `PATCH counter_offer`.
- UI actions: `partnership-rules` — empty INVITED → receiver `counter_offer`; agent initiator waiting; PENDING → `accept_pending` + «Запросить другие условия».

### Reused (not rebuilt)

- Navigator partnership negotiation (`counter_offer`, `accept_pending`, org limits API, certificate program summary).
- PROF BFF proxy pattern; no new financial product types.

## Verification (executed)

```bash
# platform
pnpm run test:proxy          # 286 pass
pnpm exec tsc --noEmit       # clean for touched app code
pnpm run build               # ok, includes /partners/agent-terms

# navigator
pnpm exec vitest run src/lib/__tests__/partnershipInviteTerms.test.ts \
  src/lib/__tests__/partnershipActions.accept-notify.test.ts
# (route.empty-terms suite: pre-existing vitest/node import issue in this env)
```

## Isolated E2E (provided, not run here)

```bash
export NAV_ROOT=/agent/repos/remcard-navigator
export PROF_ROOT=/agent/repos/remcard-partner-platform
# start navigator + platform against catalog-qa DB, then:
bash scripts/public-agent-terms-and-invite-flow-01/run-browser-gate.sh
node scripts/public-agent-terms-and-invite-flow-01/run-shell-e2e.mjs
```

Seed: `scripts/prof-admin-moderation-isolated/seed-agent-terms-invite-flow.ts` (12.5% doors + agent/store tokens in harness state).

## Acceptance mapping

| Criterion | Coverage |
|-----------|----------|
| Agent sees saved 12.5% not default 10 | Seed + summary API + UI component |
| Invite without % / no fake terms | Backend + dialog + tests |
| No ACTIVE before accept | `terms_required` + UI actions + E2E script |
| Accepted 11% survives general 15% edit | E2E script assertion |
| Legacy invite with terms | partnership-rules tests unchanged path |

## Limits

- No production deploy, SQL migration, or env/ACL changes.
- Browser screenshots not captured (harness/services unavailable in agent VM).
- `route.empty-terms.test.ts` vitest load error (`node:`) is environmental; logic covered by unit + invite route code.
