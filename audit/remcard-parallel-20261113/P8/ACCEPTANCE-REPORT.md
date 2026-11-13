# П8 — Независимая приёмка C01–C56

## RELEASE GATE (user priority — publish when ready)

**Canonical pipeline:** **`RELEASE-GATE-V3-API-PREP.md`** (G0–G9 incl. schema review, K3/K4 safety, **separate user DB approval G7**, deploy G8, read-only G9).

User auth: **prepare** API/migrations only — **no** prod apply/deploy now. **`RELEASE-GATE.md`** superseded for ordering.

P2 `ac2d4a7b` · P3 `4efb4215` · P6 `5b93b6a6` · navigator `8137` · profile `89fb8e07` (not observer BE).

## REM-PUBLISH-RESIDUAL-V2 (2026-11-13)

See **`PUBLICATION-RESIDUAL-V2.md`** and **`requirement-ledger-publish-v2.json`**. P7 final tip **`30a292d0`**. P8 **did not** re-run component suite this pass.

Taxonomy counts: `PASS=10` · `REPRODUCED_FAIL=1` · `NOT_VERIFIED=18` · `BLOCKED_CONTRACT=22` · `BLOCKED_PERSISTENCE=4` · `EXCLUDED=1`.

## Stage 2 — combined parallel tips (2026-11-13)

| Agent | Tip SHA | Product delta (summary) |
|-------|---------|-------------------------|
| P1 | `c3d7c13d` | Manifest/shell compat tests; no observer CSS |
| P2 | `e0063d15` | Contract audit only |
| P3 | `8af6b6cb` | Observer list/chips/filter JSX |
| P4 | `dd76accf` | Partner/client detail views + nav tests |
| P5 | `c265ba69` | Personal tools/edit/confirm UI |
| P6 | `3753b24c` | Direction tabs/receiving blocker/a11y |
| P7 | `9280f9e7` | `observer.module.css` + P7 computed/accent tests |
| P8 | `803b45e8` → stage-2 commit | Audit ledger only |

**Evaluation model:** read-only `git show` at each tip on owned paths + owner vitest logs. Shared packaging/contracts measured at `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0`.

**Root synthetic (not P8-run):** 120 component + 22 P7 + 12 width×theme browser — may overlap isolated regressions; does **not** lift backend, persistence, or pixel acceptance.

**P8 tests this stage:** `contracts.test.ts` only (3 PASS) — log `vitest-contracts-stage2.log`.

**Ledger v2:** `requirement-ledger-c01-c56.json` — each row has `uiStatus`, `dataPersistenceStatus`, `evidenceSha`, `browserProductionCheck`, `owner`.

**Totals (`TOTAL=56`):** `FAIL=10` · `PASS_functional=7` · `PASS_safety=4` · `BLOCKED_CONTRACT=21` · `BLOCKED_PERSISTENCE=4` · `NOT_STARTED=9` · `EXCLUDED=1`

**Closed regressions (isolated, still not section):** V7 grouped-row/KPI/nav harness; P7 accent contrast on dark; P6 tab keyboard — **live API and packaging still block.**

## Stage 1 archive (superseded details)

## Pins (read-only verification)

| Role | SHA |
|------|-----|
| Production base (Gate/Context/routes must match verbatim for publish) | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Product fix (CSS/observer parity) | `140de0a83044f324bf455ac2dfb87b17432fb8d1` |
| Author candidate (metadata tip, product tree = 140de0a8) | `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0` |
| Prior audit tip (V8 remaining ledger) | `bbf71e4a4e5815eb93e9b89424dddf41172a40d0` |
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| **P8 working branch** | `cursor/remcard-p8-acceptance-20261113` |

## Executive verdict

**Section C01–C56: NOT ACCEPTED.** No publication claim.

**V7/V8 isolated regressions: PASS** (re-verified by P8 on candidate `9fa6cc42` via fixture harness + vitest). This does **not** lift whole-section acceptance.

## Reconciliation: audit tip `bbf71e4a` vs candidate `9fa6cc42`

| Topic | V8 @ `bbf71e4a` | P8 @ `9fa6cc42` |
|--------|------------------|-----------------|
| Stale `productFixSha` 5063368a in patch-manifest | Flagged; corrected copy in audit tree | **Reconciled in product tree**: `patch-manifest-57ca4680.json` pins `140de0a8` (docs-only commits after product fix; no `src/` delta vs `140de0a8`) |
| Ledger counts (56) | 5+4+10+23+4+9+1 | **Aligned** — see `requirement-ledger-c01-c56.json` `p8Counts` |
| Packaging vs `57ca4680` | FAIL (Gate/Context/route/history/vitest) | **Still FAIL** — forbidden diff lines re-measured on `HEAD` |
| Contracts (receiving / referred / personal-meta) | MISSING / WRONG | **Unchanged BLOCKED** — `contracts.test.ts` + `fetch-observer-appeals.ts` |

### Packaging gate (independent `git diff` vs `57ca4680`)

- `OwnerClientsGate.tsx`: delta present (~148 diff lines)
- `OwnerClientsModeContext.tsx`: delta present (~41)
- Legacy `src/app/clients/page.tsx`: **absent** on candidate; route under `src/app/(cabinet)/clients/`
- `history-link-eligibility.ts`: delta present (~49)
- `vitest.config.ts`: delta present (~64)

Whole-branch transfer remains forbidden; cherry-pick must respect `excludeFromCherryPick` in patch-manifest.

## Tests actually run (P8)

```text
npx vitest run src/lib/clients-parity/ src/components/clients/observer/
```

| Result | Detail |
|--------|--------|
| **PASS** | 7 files, **41** tests (log: `vitest-scoped.log`) |
| Playwright harness | `observer-stats-grid.computed.test.ts` (13), `observer-mobile-navigation.computed.test.ts` (11) — loopback `:5377`, fixtures only |
| Component / contract | `ObserverPartnersListView.test.tsx` (7), `ObserverPartnerDetailView.test.tsx` (1), `observer-visual-tokens.test.ts` (5), `contracts.test.ts` (3), `observer-stats.test.ts` (1) |
| **BLOCKED** | Full Next.js cabinet `/clients` browser journey with production API — no fully mocked egress harness in P8 scope |

First run without Playwright browsers: 16 passed / 24 skipped — after `npx playwright install chromium`, full scoped suite green.

## C01–C56 ledger summary (`TOTAL=56`)

| Status | Count | Meaning for P8 |
|--------|------:|----------------|
| `PASS_functional` | 5 | Isolated UI/harness only (incl. C46 re-verified) |
| `PASS_safety` | 4 | No demo CRM / no live financial DB ops |
| `FAIL` | 10 | Packaging forbidden and/or visual etalon incomplete |
| `BLOCKED_CONTRACT` | 23 | Receiving CRM + observer API missing on BE/proxy |
| `BLOCKED_PERSISTENCE` | 4 | Personal overlay save honestly disabled |
| `NOT_STARTED` | 9 | Not exercised this pass (screenshots, overflow sweep, etc.) |
| `EXCLUDED` | 1 | C05 agent pages 107–112 |

Full per-id evidence: `requirement-ledger-c01-c56.json`.

## Isolated PASS vs section acceptance (explicit)

| Layer | P8 |
|-------|-----|
| Grouped row y-parity, KPI cascade 360/760, real click back, open button bounds | **PASS** (harness) |
| Checkbox/disclosure/nav fixture tests | **PASS** (component) |
| Receiving appeals CRM C07–C24 | **BLOCKED_CONTRACT** |
| Observer referred list live data C27–C34, C32 | **BLOCKED_CONTRACT** |
| Personal alias/tag/archive persist C35–C38 | **BLOCKED_PERSISTENCE** |
| Production packaging C01–C03 | **FAIL** |
| Pixel/screenshot etalon C45–C48 | **FAIL / NOT_STARTED** |

## Remaining work (cross-owner)

1. **Packaging owner** — restore verbatim production surfaces per `57ca4680` while landing observer/direction via selected-file apply (`OwnerClientsGate`, `OwnerClientsModeContext`, `src/app/clients/**`, `history-link-eligibility`, `vitest.config.ts` are not P8-writable).
2. **Backend / proxy owner** — implement referred-appeals + client-appeals + personal-meta contracts (`remcard-navigator` / `remcard-proxy.ts`).
3. **Visual QA (bc-0a64ca5a lane)** — screenshot overlay matrix C45–C48; P8 does not claim PASS.
4. **Persistence** — wire personal-meta; until then UI must keep Save disabled (already verified in `ObserverPartnersListView.test.tsx`).

## Changed files (P8 commit scope)

- `audit/remcard-parallel-20261113/P8/ACCEPTANCE-REPORT.md`
- `audit/remcard-parallel-20261113/P8/requirement-ledger-c01-c56.json`
- `audit/remcard-parallel-20261113/P8/vitest-scoped.log`
- `audit/remcard-parallel-20261113/P8/generate-ledger.mjs`

**Product writes:** none (`PRODUCT WRITE ALLOWLIST: []`).

## Protected resources

- Estimate record `a6ae55eb6d984880`: not opened.
- Production deploy / main push: not performed.
