# Partner primary kind unification (2026-10-29) — review pass 3

## Branches and SHAs

| Repo | Branch | Notes |
|------|--------|--------|
| remcard-partner-platform | `feat/partner-primary-kind-unify-20261029` | **`a140bc8c9014af4ac922bd05e635344b02d94fb7`** |
| remcard-navigator | `feat/partner-primary-kind-unify-20261029` | **`af8959ee7da7f3046a8ff88177e5f05adc6f7587`** |

Prior review tips (superseded): pass2 FE `a140bc8c…`, BE `af8959ee…`; pass1 FE `62c11e58…`, BE `4610cdbf…`.

Pass 3 highlights: search org `partnerType` select + route DTO test; registration finish preserves AGENT on store re-finish; audit employee/prof_test segments, working org id, unknown empty storage; live audit CLI blocked by default; integration patch doc `INTEGRATION-PATCH.md`.

## Scope

One **canonical primary kind** (`resolvePartnerKindUi`) across list/card/share, **partnership search** filters + DTO, **registration join finish** writes, and **dry-run registry audit**. No partnership side swaps for Seda/ОПТОВИК, no deploy, no production writes.

## Model (unchanged)

Primary kind = `resolvePartnerKindUi({ partnerType, partnerActivities })`:

| Case | partnerType | partnerActivities | Kind |
|------|-------------|-------------------|------|
| Seda | COMPANY | AGENT | agent |
| ОПТОВИК | COMPANY | STORE, AGENT | company |
| Legacy pure agent | STORE | AGENT | agent |
| Specialist | MASTER | SERVICE | specialist |
| Store | STORE | STORE | store |
| Company | COMPANY | STORE, SERVICE | company |

Additive DB field **not applied**; storage remains `partnerType` + `partnerActivities` when finish/search/audit agree on target state.

## Changes by area

### 1. Search (backend)

| File | Change |
|------|--------|
| `src/lib/partnershipSearchQuery.ts` | `agentPartnerTypeWhere` → `registryListFilterForPartnerTypeParam` (non-overlapping; pure agent ≠ company) |
| `src/lib/partnershipSearchResultDto.ts` | `partnerKind`, `partnerKindLabel`, `partnerActivities`, canonical `partnerTypeLabel` |
| `src/app/api/partnership/search/route.ts` | Select `partnerActivities`; expose kind fields + `organizationPartnerType` |

Frontend: `PartnerSearchResult` extended; `PartnersHub` continues to show `partnerTypeLabel` (now canonical from API).

Tests: `partnershipSearchQuery.filters.test.ts`, `partnershipSearchResultDto.test.ts`, `partnership-search-kind.test.ts` (platform).

### 2. Registration finish (backend)

| File | Change |
|------|--------|
| `src/lib/profRegistrationJoinFinish.ts` | Finish writes **replace** activities via `freshPartnerActivitiesForJoinKind`; `completedJoinState` requires resolved kind + exact activity set + target `partnerType`; `decideRegistrationJoinFinish` exported for tests |

Tests: `profRegistrationJoinFinish.kind.test.ts` (STORE→agent legacy re-reg, AGENT already_ready, COMPANY mixed vs agent finish, non-overlapping already_ready).

Does **not** clear capabilities blindly; PRO/STAFF role rules unchanged.

### 3. Registry audit (backend, dry-run)

| File | Change |
|------|--------|
| `src/lib/partnerPrimaryKindAudit.ts` | Issues: finished kind mismatch, multi-org types, storage vs target, employee context; segments blocked/deleted |
| `scripts/partner-primary-kind-audit.ts` | Requires `--i-acknowledge-read-only`; `SET TRANSACTION READ ONLY` inside transaction; full user scan (incl. deleted); all org `partnerType`s; totals `userTotalAll` / `userTotalNotDeleted` |

Tests: `partnerPrimaryKindAudit.test.ts`.

**Production full registry: BLOCKED** on this cloud agent (no authorized live read DSN / admin runner). Staging/local:

```bash
cd remcard-navigator
pnpm tsx scripts/partner-primary-kind-audit.ts --i-acknowledge-read-only --json-out=artifacts/partner-primary-kind-audit/dry-run.json
```

Do **not** treat fixture/unit tests as proof of production coverage.

### 4. Lists/cards (frontend, prior pass)

`resolvePublicPartnerType` → `resolvePartnerKindUi` in `src/lib/agent-r04/partner-filters.ts` + acceptance tests.

## API / write path matrix

| Path | Read kind | Write primary kind |
|------|-----------|-------------------|
| Admin registry API | `partnerKind` (existing) | unchanged |
| GET `/api/partnership/search` | `partnerKind` + activities | n/a |
| Registration join finish | n/a | `freshPartnerActivitiesForJoinKind` + `targetStateForPartnerKind` |
| Partner list/card (R04) | `resolvePartnerKindUi` | n/a |
| Audit script | `analyzePartnerPrimaryKind` | none (`--apply` disabled) |

## Tests run (this pass)

- Navigator vitest (26 tests, pass): `partnershipSearchResultDto`, `partnershipSearchQuery` (+ filters), `partnerPrimaryKindAudit`, `profRegistrationJoinFinish.kind`, `partnerKindUi`
- Navigator `tsc --noEmit`: **blocked by pre-existing** `src/lib/bots/__tests__/maxBotStartedLogin.pipeline.test.ts` TS2345 (unrelated to this branch); changed partner-kind files typecheck clean
- Platform vitest (13 tests in kind/search subset, pass): `partner-kind-ui`, `partner-filters`, `partnership-search-ui` (includes canonical DTO cases)
- Platform `tsc --noEmit`: pass
- Platform `pnpm run build`: pass

## Known limits

- Empty activities + legacy `partnerType` only → unknown kind.
- Inverted partnership graph labels remain counterparty-relative; sides not mutated.
- Normalization/migration of historical rows is **out of scope** until dry-run on an approved read-only DB.
