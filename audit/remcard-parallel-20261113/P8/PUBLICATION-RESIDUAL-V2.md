# П8 — REM-PUBLISH-RESIDUAL-20261113-V2

Independent read-only auditor · **whole section not publishable**.

## SHA / tips

| Role | SHA |
|------|-----|
| P8 branch tip (pre-commit) | `2a9af427fed47c21bae49d786846c52167476875` |
| Production packaging base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Navigator release (preserve) | `3c37ca2557069a43544b7d72848fd53c37e3be5e` |
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| P1 (packaging) | `20b93f87544ca0b59857be73ce46b2e62afe466e` |
| P2 | `1340a128e0e436b39d36feabb6b0c1a894b132a5` |
| P3 | `8af6b6cbe5c3e70a0f79932b62d3f78f09ff5543` |
| P4 | `effd85f3e7ca8b4ce1a373074e95d975d89cc492` |
| P5 | `dbbe44557a42eb354397315b70e1290af490c45c` |
| P6 | `981c72aff23595d32e157dc9642e08c02a0cb70d` |
| P7 **final** | `30a292d002d56e0daaeebdff62d1fce902590362` |

## Root evidence reconciled (P8 did not re-run)

| Source | Finding |
|--------|---------|
| P1 `PUBLICATION-RECONCILE-V2.md` | `clientsSectionPublishable: false`; 27-path UI-only cherry-pick manifest; `validate-owner-assembly.log` **PASS** |
| P1 `p1-p7-packaging-manifest.json` | Byte-extract per owner tip; **reject** whole P7 tree |
| P6 `publish-residual-REM-PUBLISH-RESIDUAL-20261113-V2.md` | Role boundaries + loader isolation **17+3** component PASS; browser **NOT_VERIFIED** |
| P7 `@30a292d0` | `observer.module.css` remeasure; **27** P7 tests + partial paired screenshots in audit; full shell **OPEN** |
| P7 `fetch-observer-appeals.ts` | Still **`BLOCKED_CONTRACT`** (no production call) |
| GitHub search | `referred-appeals` / `client-appeals` on `remcard-navigator`: **0** (search incomplete) — treat contracts as **still absent** |

## P8 tests this pass

**None** (by design). Last P8 smoke: `vitest-contracts-stage2.log` (3 PASS @`2a9af427`). Root broad green **not** duplicated.

## Primary taxonomy (`TOTAL=56`, each id once)

| Status | Count | Meaning |
|--------|------:|---------|
| PASS | 10 | Safety / isolated synthetic (not page acceptance) |
| REPRODUCED_FAIL | 1 | C01 packaging vs 57ca reproducible |
| NOT_VERIFIED | 18 | Page/visual/continuity — **missing screenshot ≠ FAIL** |
| BLOCKED_CONTRACT | 22 | Receiving + observer APIs |
| BLOCKED_PERSISTENCE | 4 | C35–C38 |
| EXCLUDED | 1 | C05 |

Detail: `requirement-ledger-publish-v2.json`.

## Ready for Root to package (UI-only, not acceptance)

Per P1 manifest — blob-extract at owner tips onto **57ca** only:

- Direction: P6 four files  
- Observer JSX: P3/P4/P5 lists + P1 body snippet  
- CSS: P7 `observer.module.css` @ **30a292d0** (not `9280f9e7`)  
- Honest adapter: `fetch-observer-appeals.ts` (blocked until API)

**Forbidden:** Gate, Context, cabinet routes, `vitest.config`, new-partner-empty trio deltas.

## Unresolved — assign before claiming section acceptance

| Blocker | Owner | Next action |
|---------|-------|-------------|
| AC-GATE-CONTEXT | Root | Assemble on 57ca; never promote branch gate/route |
| AC-REFERRED-API | Backend / P2 | Implement + proxy; validate on navigator `3c37ca25` |
| AC-PERSONAL-PERSIST | Backend | personal-meta; keep Save disabled until proven |
| AC-RECEIVING-APPEALS | Backend | client-appeals (agent receiving stays excluded) |
| AC-PAGE-BROWSER | Root QA | Mocked `/clients` matrix per P6 plan |
| Pixel etalon C42–C48 | Root QA + P7 | Use P7 `screenshots/` + paired-computed; fill NOT_VERIFIED |

## Verdict

**Do not publish** whole Clients section. Root may ship **bounded honest observer UI** with blockers visible and **no** fake persistence. Component/harness PASS **≠** page acceptance.
