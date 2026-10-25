# STORE-COMPANY-HOME-ADAPT-02

## Runtime refs (evidence tip)

| Role | SHA |
|------|-----|
| Frontend base | `be43ffc8a34088392635fb9e9079b5929369c117` |
| Backend base | `5a2c2a7d9d5c03f2b948626dea2a987daa0422a4` |
| **Frontend product (evidence tip)** | `935e05c007a2cc904a66e58f7f4397b75cff3009a` |
| **Backend product (evidence tip)** | `cfbc456607307460c6b263b951a761a54f734635` |

**Status: READY** for review re-check on `feat/store-company-home-adapt-02` (no merge/deploy).

## Blockers 1–5 (closed)

1. Owner branch via `resolveOwnerBusinessHomeBranch` + cookie/query; no reliance on ORG_OWNER `activeBranch`; foreign / needs_branch / single-branch auto-select.
2. Sales count strict `certificatePartner.branchId === selected` (no null OR).
3. Employee union excludes REVOKED / blocked; dedup; owner not counted.
4. GET `Cache-Control: private, no-store`; `404` + `NO_ORG` vs `403` + `FORBIDDEN`.
5. FE branch picker (PATCH context), `contextEpoch` reload, stale-response guard, partial errors.

## Gate 6 — CabinetShell synthetic stack

Script: `scripts/store-company-home-adapt-02/run-browser-gate.sh` (isolated PG :55432, PROF :3420, NAV :3421, production `next build`).

| Check | Result |
|-------|--------|
| `shell-browser-gate.exit` | `0` |
| Store CTA → `/scanner` | pass |
| Company CTA → `/profile?section=team` | pass |
| Master not on business owner home | pass |
| Light/dark × 1440/375/320 screenshots | `artifacts/store-company-home-adapt-02/visual-shell/` |
| `shell-gate.json` failures | `[]` |

Dev-preview captures under `visual/` remain supplementary only.

## Gate 7 — tests

| Suite | Exit |
|-------|------|
| navigator `businessHomeOwnerBranch.test.ts` | 0 |
| navigator `businessHomeMskPeriod.test.ts` | 0 |
| navigator `businessHomeMetrics.integration.test.ts` (real `getProContext` + prisma) | 0 |
| navigator `route.test.ts` + `route.integration.test.ts` (real auth + builder) | 0 |
| partner gate + presentation + load lifecycle | 0 |
| partner `npm run build` | 0 |
| navigator `tsc --noEmit` error count vs BE base `5a2c2a7d` | **52 = 52** (Δ new diagnostics **0**; baseline remains **52**, not 56) |

### TS2339 diagnostic (blocker 1 confirmation)

Independent `pnpm exec tsc --noEmit` on `remcard-navigator`:

| Commit | Role | `error TS` count | exit |
|--------|------|------------------|------|
| `5a2c2a7d` | BE merge-base | 52 | 2 |
| `5a239b4` | first metrics landing | **56** (+4 vs base) | 2 |
| `c477156` | home-branch adapter fix | **52** | 2 |
| `cfbc456` | tip (incl. route integration) | **52** | 0 |

Exactly **four** new errors on `5a239b4`, all `TS2339` on `never` from `params.ctx.activeBranch.{name,city,address,id}` while `ORG_OWNER` narrows `activeBranch` to `null`:

```
src/lib/businessHomeMetrics.ts(155,28): Property 'name' does not exist on type 'never'.
src/lib/businessHomeMetrics.ts(156,28): Property 'city' does not exist on type 'never'.
src/lib/businessHomeMetrics.ts(157,31): Property 'address' does not exist on type 'never'.
src/lib/businessHomeMetrics.ts(169,33): Property 'id' does not exist on type 'never'.
```

Closed in `c477156` via local `resolveOwnerBusinessHomeBranch` + `selectedBranch` / `preferredBranchId` — **no** `any`, **no** `@ts-ignore`, **no** change to global `getProContext` / `proBranchContext.ts`. Tip `businessHomeMetrics.ts` does not read `ctx.activeBranch`.

Not in automated matrix (deferred): expired prof-test delegation HTTP case, MSK midnight order boundary on live PG (unit MSK tests cover range math).

## Preserved UX

Moderation UX-02, catalog, dark contrast from `be43ffc` baseline unchanged on this branch scope.

## «Мои операции»

Actor `storeUserId` orders today (MSK) with explicit UI subtitle — not a universal ops journal.
