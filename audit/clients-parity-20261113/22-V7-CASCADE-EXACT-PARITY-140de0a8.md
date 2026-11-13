# V7-CASCADE-EXACT-PARITY — pin EXACT `140de0a8`

## Pins (authoritative)

| Role | SHA |
|---|---|
| **implCandidateSha / productFixSha (EXACT)** | `140de0a83044f324bf455ac2dfb87b17432fb8d1` |
| Author tip after stamp (not the fix content) | `a36c609b7ea7a43ce4f4ec544f7ad0e60b403447` |
| Obsolete visual-FAIL tip (click-only) | `0729c12f1e321b1aa458d95016eb4cc3f4428f6f` |
| Auditor commit that must **not** promote 0729 click PASS → full parity | `65df323e…` |
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| Packaging base (must remain verbatim) | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Prior V6 Computer pin (still valid for mobile-click/KPI isolated) | `78e4852194a0b9d307ee92743ae754dd18d5a9ba` |

Computer extracted pure CSS cascade + harness geometry — **no** whole-branch production transfer.

## Verdict on `0729c12f` (do not promote)

Independent remount at EXACT `0729c12f` @ 375:

| Check | Result |
|---|---|
| Real click partner→client | **PASS** (`openW=315`) |
| `grid-template-areas` | `"check open" / "status status" / "updated updated" / "edit edit"` |
| `status.top` / `updated.top` | **273.5 / 324.5** (`Δ=51px`) |
| `gridRow` | named `status` / `updated` |
| Visual same-row vs prototype `3dc31836` | **FAIL** |

Root cause: superseded `@media (max-width:768)` `grid-template-areas` block still present **before** prototype `max1100` / `max760` rules. Column template already `24px Npx Npx`, but named areas forced status and updated onto separate rows.

**Auditor `65df323e` must not treat 0729 click PASS as full visual parity.**

## Independent auditor replay @ `140de0a8`

Harness: author worktree @ tip containing `140de0a8` CSS  
Script: `scripts/clients-parity-20261113/audit-v7-140de0a8-grouped-parity.mjs`  
Report: `v7-pin-140de0a8/v7-grouped-parity-report.json`

| Check | Result |
|---|---|
| Grouped `status.top==updated.top` ≤1px @ 375/360/320/768/1024 | **PASS** (`Δ=0`, areas=`none`, `gridRow=auto`) |
| Flat row: no named areas, no `0px` dead tracks @ 375/360/320 | **PASS** |
| Real click + back (grouped + flat) | **PASS** |
| Name `min-height:44` / open height 47.5 | **PASS** |
| KPI vitest cascade (13 computed + tokens) | **PASS** (4 above 360 / 2 at ≤360 preserved) |
| Component Observer list/detail | **8/8 PASS** |

At 375 after fix: cols `24px 151.5px 151.5px`, status+updated both `y=273.5`.

Screenshots: `v7-pin-140de0a8/v7-0729-FAIL-375-separate-rows.png` vs `v7-140de0a8-PASS-375-same-row.png`.

## Acceptance scope (narrow)

Accepted **only** this isolated regression:

1. Remove obsolete max768 personal-row named areas; keep prototype max1100 grouped + max760 flat only; same-row status/updated geometry + real clicks.

**Still carries** V6 isolated accepts (mobile click geometry, KPI cascade) at prior pin `78e48521`.

**Not** accepted:

- Full visual / prototype pixel parity for the section
- Receiving-side completion
- Server `referred-appeals` / personal-overlay contracts
- Full C01–C56 section acceptance / publication
- Promoting `0729` or `65df323e` click PASS to full parity

## Packaging (still FAIL for delivery)

Vs EXACT `57ca4680`, tip still diverges:

- `OwnerClientsGate.tsx`, `OwnerClientsModeContext.tsx`
- `src/app/(cabinet)/clients/page.tsx` (route move)
- `src/lib/onboarding-step/**` (helper)
- `vitest.config.ts`

Stale whole-branch transfer remains **forbidden**. Selected-file cherry-pick only.

## Contracts / persistence

Full section remains **BLOCKED** / **BLOCKED_PERSISTENCE** — unaccepted. No DB/rights/API/formula/infra/deployment invention.
