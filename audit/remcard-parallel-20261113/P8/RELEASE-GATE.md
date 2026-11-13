# П8 — RELEASE GATE · Клиенты в ЛК партнёра (C01–C56)

**Decision: NO-GO** for whole-section publication on `57ca4680` until gates G1–G5 close.

**P8 tip (this commit):** see git log. **Product writes:** none.

## Pins (read-only)

| | SHA |
|---|-----|
| Partner publication base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Navigator (user pin — **P2 must re-prove**) | `8137ddd1ae5bad880fa28df34bab04e460bf2bdd` |
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| Stale P2 scan (do not treat as pass) | `3c37ca25` / tree `3cb569ff` — still **MISSING** referred/personal |

## Owner tips (2026-11-13 PM fetch)

| Owner | Tip | Notes |
|-------|-----|-------|
| P1 | `20b93f87` | Packaging manifest; `clientsSectionPublishable: false` |
| P2 | `1340a128` (branch) / `ea9bd5dd` (2-06bf residual) | Contracts **ABSENT** @ navigator scan |
| P3 | `9c3221ad` | **Product:** P4 `backFrom` integration in list |
| P4 | `f7198e9d` | Docs handoff |
| P5 | `dbbe4455` | Personal UI; save still blocked |
| P6 | `981c72af` | Role/isolation component PASS |
| P7 | `43c6bd83` | Audit-only residual measure; CSS pin `c5c7f209` |
| P8 | `53a5ce74` → next commit | Ledger / gate |

**Verified @ all above product tips:** `fetch-observer-appeals.ts` → `BLOCKED_CONTRACT`; `remcard-proxy.ts` — **no** `referred-appeals` / `client-appeals` / `personal-meta`.

**P8 check this pass:** `npx vitest run src/lib/clients-parity/contracts.test.ts` → **3/3 PASS** (blocker map only; **not** integration).

---

## Ordered release gates (dependencies)

### G1 — Contract & storage proof **(BLOCKING)**

| | |
|---|---|
| **Owner** | **P2** then Backend |
| **Scope** | C07–C24 receiving (specialist); C26–C34, C39–C40 referred list/detail; C35–C38 personal overlay |
| **Status** | **BLOCKED** |
| **Evidence now** | P2 `publication-residual-20261113-v2.md` @ MISSING on navigator scan; GitHub code search `referred-appeals` / `client-appeals` on `remcard-navigator`: **0** (2026-11-13 P8) |
| **Stale vs reproduced** | Stale: pre-`8137ddd1` navigator SHA in older audits. **Reproduced failure (until disproven):** no partner-proxy routes + adapter blocked at `9c3221ad`/`43c6bd83`. |
| **Proof to close** | P2: read-only inventory at **`8137ddd1`** with paths + route names; signed `contract-decisions.json` **minimal decisions** (not proposals). Backend: ship routes + schema **without** DB migrations in partner repo; P2 re-audits. |
| **Next action** | Cursor task → **P2**: re-scan navigator `8137ddd1`, update `P2.navigator-evidence.json`; block Root until `MISSING` cleared or scoped honest UI-only publish. |

### G2 — Actual integration **(BLOCKING — promised use)**

| | |
|---|---|
| **Owner** | Root + Proxy owner |
| **Scope** | `remcard-proxy.ts` allowlist; `fetchObserverReferredAppeals` real `remcardFetch`; personal-meta batch/single; filtered list matches prototype semantics |
| **Status** | **BLOCKED** |
| **Proof to close** | Staging mock or read-only account run: list loads **without** fixture injection; save/archive either succeeds with correct API or stays **visibly disabled** (no silent success). Component tests ≠ this gate. |
| **Next action** | After G1: wire proxy + adapter; Root runs **synthetic** intercepted QA on `prof.remcard.ru` shell (blocked egress). |

### G3 — Role safety on production page **(BLOCKING for “important section”)**

| | |
|---|---|
| **Owner** | Root QA |
| **Scope** | C02, C05, C06, agent p.106 observer-only; eligible partners keep observer mode; **no** agent receiving CRM (107–112 **EXCLUDED**) |
| **Status** | **NOT_VERIFIED** (page) |
| **Evidence now** | P6 `17+3` component PASS @ `981c72af` — **does not** satisfy gate |
| **Proof to close** | Mocked browser matrix on **assembled 57ca** package: agent → no tablist; specialist → receiving blocker + observer tab lazy load (P6 isolation). |
| **Next action** | Root: P6 publish plan in `publish-residual-REM-PUBLISH-RESIDUAL-20261113-V2.md`. |

### G4 — Prototype controls & visual **(BLOCKING for “all ready”)**

| | |
|---|---|
| **Owner** | P7 + Root QA |
| **Scope** | Compact cards, bulk one/many, breakpoints `3dc31836` |
| **Status** | **NOT_VERIFIED** (full matrix) |
| **Evidence now** | P7 @ `30a292d0`/`43c6bd83`: harness + partial paired screenshots; **missing full screenshot ≠ functional FAIL** but blocks “everything ready” |
| **Stale** | Old FAIL labels on pixel without re-measure post-`c5c7f209` CSS |
| **Proof to close** | Signed overlay/ledger on **assembled** shell; open items in P7 paired-residual tests closed or waived explicitly |
| **Next action** | Root QA after G5 assembly; do not publish as complete section with NOT_VERIFIED C42–C48. |

### G5 — Metadata & packaging **(BLOCKING)**

| | |
|---|---|
| **Owner** | **Root** |
| **Scope** | C01; `OwnerClientsGate`, `OwnerClientsModeContext`, `src/app/clients/**`, `history-link-eligibility`, `vitest.config` **verbatim 57ca** |
| **Status** | **REPRODUCED_FAIL** vs candidate `9fa6cc42` |
| **Evidence now** | Legacy `src/app/clients/page.tsx` **present @57ca**, **absent @9fa6cc42**; Gate diff **reproduced** |
| **Proof to close** | P1 `validate-owner-assembly.log` PASS on **selected paths only**; post-assembly `git diff 57ca` shows only allowlisted blobs |
| **Next action** | Root selected-file cherry-pick per `p1-p7-packaging-manifest.json`; include P3 `9c3221ad` list integration + P7 CSS `c5c7f209` blob |

---

## C01–C56 ledger snapshot (primary status, each ID once)

Counts unchanged from `requirement-ledger-publish-v2.json` after tip refresh:

`PASS=10` · `REPRODUCED_FAIL=1` · `NOT_VERIFIED=18` · `BLOCKED_CONTRACT=22` · `BLOCKED_PERSISTENCE=4` · `EXCLUDED=1`

**User priority (observer + compact + bulk):** cannot ship as *complete* while **G1, G2, G3, G5** open. Honest blocked shell publish remains **NO-GO** per user (“do not publish a blocked shell as the completed section”).

## READY / NO-GO

| Question | Answer |
|----------|--------|
| Whole Clients section publishable? | **NO** |
| Bounded UI on 57ca without live data? | Root **may** (per P1) — **not** “всё готово” |
| When user can publish “important section” complete? | After **G1→G2→G5→G3→G4** in order; C01–C56 all non-excluded **PASS**; zero **BLOCKED** / no **NOT_VERIFIED** on promised paths |

## Cursor tasks to file (recommended)

1. **P2:** Prove contracts @ navigator `8137ddd1` — update evidence JSON; no API product edits in partner repo until decisions approved.
2. **Backend:** Implement referred-appeals read + personal-meta overlay per P2 minimal decisions (separate repo).
3. **Root:** Assemble allowlisted blobs; run G3/G4 mocked page QA; publish only when gates green.
