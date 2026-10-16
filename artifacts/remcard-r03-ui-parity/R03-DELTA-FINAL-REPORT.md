# R03 corrective — final report (small delta)

**Control point:** owner-approved corrective pass plus remaining delta **1–3** are **complete**. Profile work must stack on this tip, not replace it.

## Pull requests

| Repo | PR | Branch | Integration base |
|------|-----|--------|------------------|
| remcard-partner-platform | [#18](https://github.com/karenavedikyan/remcard-partner-platform/pull/18) | `cursor/r03-ui-parity-b3e3` | #17 @ `375d2636613b4d2f0a3bec89a691ad7eb8c05ad7` |
| remcard-navigator | [#681](https://github.com/karenavedikyan/remcard-navigator/pull/681) | `cursor/r03-ui-parity-b3e3` | `40b8094e4bf2158fd7a10b1cc1c33474b90a77b3` |

## Exact SHAs (do not treat as release until operator merges)

| Role | SHA | When |
|------|-----|------|
| **R03 branch tip (platform)** | `a247876` | docs + artifacts pin on delta |
| **R03 delta code** | `386d2f51b4896e38f893cafc6cb0c026167b71d9` | toolbar, pill, runner, fixture |
| **Accepted corrective runtime** | `911362a5c876fb62a25add4f6e97e7e546fb87cc` | cards col, stats, table, borders (not reworked) |
| **Navigator R03 tip** | `651150754af947a3ff896fe9431c68bd45ac5266` | list DTO (`partnerOffers`, `hasPurchases`) |

**Delta capture:** `2026-10-16T05:11:12.254Z` · `screenshots/captures.json` → `ok: true`, 30 entries (merge + carry-over).

## Delta closure (items 1–3)

| # | Requirement | Status | Proof |
|---|-------------|--------|-------|
| 1 | Mobile toolbar @375: full-width search; show + list/cards one row; filters below | **CLOSED** | `AgentR03ListToolbar.tsx`, late CSS in `agent-r03.module.css`; assert `toolbarRowOk` |
| 2 | Compact purchase pill in client cards; mobile list status line then name | **CLOSED** | `.clientCard .purchasePill`, `AgentR03MobileClientRow.tsx` |
| 3 | Evidence: matched pair, viewport bottomnav, per-capture metadata, cards @320 | **CLOSED** | `PARITY_MATCH`, `*-matched`, `*-viewport-*`, `*-cards320`, `carryOverFrom` |

## Tests run (this RC)

- `npm run build` — pass (local)
- Vitest: `certificateOffers`, `formatDiscountPercent`, `clientListRow`, `sections`
- Navigator: `agentCertificateList.test.ts` (on #681 branch)
- `R03_DELTA_CAPTURE=1 node scripts/r03-ui-parity-visual.mjs` — pass
- Browser smoke steps in `TEST-RESULTS.json`

## Artifacts index

- `PARITY-MATRIX.md` — matrix status
- `RELEASE-REPORT.md` — RC summary
- `TEST-RESULTS.json` — commands / smoke
- `screenshots/` — PNG + `captures.json`

## Stacked work dependency (AGENT-PROFILE-PARITY)

R03 is **not** assumed merged to `release/prof-v1-20261007`. Profile parity branch must:

- Branch from platform **`a247876`** (or later tip of `cursor/r03-ui-parity-b3e3` only)
- Declare dependency on PR **#18** + **#681**
- **No** mixing profile diffs into #18/#681

## Honest open items (unchanged, not blockers for this control point)

- Full ref vs impl dataset: **NOT_VERIFIED** (single pair **PARTIAL** via `PARITY_MATCH`)
- Stat money **—**, client **«бонус —»**, page-only selection, impl test banner
- Region pixel diffs on non-matched rows: operator visual review; **CAPTURED ≠ 1:1 PASS**

**No merge / deploy / production / flags performed.**
