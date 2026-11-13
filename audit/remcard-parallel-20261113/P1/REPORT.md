# П1 — Сборка и совместимость Клиентов

## SHA anchors (distinguished)

| Role | SHA | Note |
|------|-----|------|
| Production base (read-only) | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` | Gate + `src/app/clients/page.tsx` wiring |
| Branch base (pre-P1) | `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0` | Author candidate; not production |
| Product fix pin | `140de0a83044f324bf455ac2dfb87b17432fb8d1` | Observer CSS / V7 regressions (not P1-owned) |
| Manifest metadata tip (prior) | `6355485eb2c531a263545f5159384b88a956aba2` | Handoff/docs only; unchanged by product tree |
| P1 commit | `36ecfc4bc6ee34fa5f1eeb5b2cf0d8f68df113e9` | Tests + manifest/handoff pins only |

## Requirement status (P1 scope)

| ID | Requirement | Result |
|----|-------------|--------|
| P1-LIST-SHELL | `ClientsListWorkspace` mounts `ClientsDirectionWorkspace`; `canLinkOnboardingHistory` forwarded | **PASS** |
| P1-LIST-PROD-SNIPPET | Production apply uses direct `OwnerClientsGate` (no cast) per snippet | **PASS** |
| P1-LIST-PARITY-SHIM | Branch-only `ProductionOwnerClientsGate` cast documented in manifest | **PASS** |
| P1-DETAIL-NO-DELTA | `ClientDetailWorkspace` byte-identical to `57ca4680` | **PASS** |
| P1-MANIFEST-EXCLUDE | Gate, context, cabinet routes, history helper, vitest boundary excluded | **PASS** |
| P1-BROWSER | E2E / live API | **BLOCKED** (no mocked egress harness in P1 allowlist) |
| P1-SECTION | Full «Клиенты» acceptance | **BLOCKED** (team ledger: persistence, referred appeals, C01–C56) |

## Tests run (scoped)

```text
npm run test:component -- \
  src/components/clients/P1.ClientsListWorkspace.compat.test.tsx \
  src/components/clients/P1.ClientDetailWorkspace.compat.test.tsx \
  src/components/clients/ClientsListWorkspace.props.test.tsx
```

Result: **3 files, 11 tests, all PASS** (log: `vitest-run.log`).

## Safe cherry-pick include (P1 confirmed)

- `src/components/clients/ClientsListWorkspace.tsx` (body + direction shell; **export** must match snippet on `57ca4680`)
- `src/components/clients/direction/**`
- `src/components/clients/observer/**`
- `src/lib/clients-parity/**` (except QA-only fixtures if policy restricts)
- `scripts/clients-parity-20261113/**`

**Omit from pick:** `ClientDetailWorkspace.tsx` (no delta vs production).

## Explicit exclude (do not transfer from branch)

| Path | Reason |
|------|--------|
| `OwnerClientsGate.tsx` | Production uses `useBusinessSectionDispatch` + history prop; branch R5 gate differs |
| `OwnerClientsModeContext.tsx` | Production provider surface |
| `src/app/(cabinet)/clients/**` | Parity/dev routing only |
| `src/lib/onboarding-step/history-link-eligibility.ts` (+ test) | Read-only at base |
| `vitest.config.ts`, `clients-rsc-boundary.test.ts` | Infra / boundary |

**Preserve on production base:** `src/app/clients/page.tsx`, `src/app/clients/[id]/page.tsx`.

## Dependency table (P1-owned shells)

| Owned file | Depends on (other owners) | P1 action |
|------------|---------------------------|-----------|
| `ClientsListWorkspace.tsx` | `direction/ClientsDirectionWorkspace`, `OwnerClientsGate` (read-only), `OwnerClientsModeContext` (read-only), `PageHeading`, `business-clients/copy` | Document cast shim; snippet for prod export |
| `ClientDetailWorkspace.tsx` | `AgentClientDetail`, `OwnerClientsGate`, context, copy | No edit; no pick needed |
| `patch-manifest-57ca4680.json` | `author-handoff-v6.json` | Pin parity/production notes |
| `author-handoff-v6.json` | Observer/direction lists at audit SHA | Record detail workspace no-delta |

## Cross-owner dependencies (not P1)

- **Direction (П2+):** `ClientsDirectionWorkspace`, tabs, `ReceivingAppealsBlocked`
- **Observer UI:** `observer/**`, `observer.module.css` (product fix `140de0a8`)
- **Parity lib:** `fetch-observer-appeals`, contracts, fixtures — **BLK-RECEIVING-APPEALS**, **BLK-OBSERVER-REFERRED**, **BLK-OBSERVER-PERSONAL-PERSIST**
- **Routes:** Production `src/app/clients/page.tsx` must keep `canLinkOnboardingHistory={...}` — owned by gate/route agents, read-only here

## Remaining work (P1)

- None for wiring/manifest in allowlist; await referred/personal persistence owners before any production patch assembly.
- Optional: metadataTipSha pin commit after P1 SHA is finalized (avoid self-referential hash in same commit).

## Changed files (P1)

- `src/components/clients/P1.ClientsListWorkspace.compat.test.tsx` (new)
- `src/components/clients/P1.ClientDetailWorkspace.compat.test.tsx` (new)
- `src/lib/clients-parity/patch-manifest-57ca4680.json`
- `src/lib/clients-parity/author-handoff-v6.json`
- `audit/remcard-parallel-20261113/P1/*`

**Unchanged product TSX:** `ClientsListWorkspace.tsx`, `ClientDetailWorkspace.tsx` (audited only).
