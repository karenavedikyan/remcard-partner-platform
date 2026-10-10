# PROF-I integration & release acceptance

**Release candidate (immutable runtime):** platform `ad9349b2fa07d0b2cff387c8950c33cdc91fb94a` · navigator `ecc798328e117394df52e4c0cf4ee246abf0b58c`  
**Branch:** `feat/prof-i-integration`  
**Release docs:** `docs/PROF-I-RELEASE-HANDOFF.md` · navigator `docs/PROF-I-RELEASE-MANIFEST.json`

This document keeps **historical SHA rows** for past runs; the table below is the single acceptance index.

## Evidence table

| Check | Verified SHA / pair | Result | Artifact |
|-------|---------------------|--------|----------|
| Full stream **E** (browser harness, all scenarios) | platform `f5d749f40e17d84b9237ea1b13ba7cb5198db102` · navigator `4a31dbe5d5a67e188c26f13b854c963099b706eb` | **PASS** (no console/page errors; employee page **without** `trackPage`) | `docs/prof-i-e-browser-report.json` (2026-10-10 full E run) |
| React **#418** hydration (theme SSR/client) | platform `f5d749f` area (theme fix) | **PASS** | `ThemeToggle.test.tsx`, `theme-preference.test.ts`; full E console clean at `f5d749f` |
| Stand / BFF / payout harness alignment | platform `167099e` → `f5d749f` generation | **PASS** (prior fix-pass) | earlier report sections / payout scenario in browser report |
| **Hydration fix** targeted vitest + prod build | platform tip at hydration fix | **PASS** | vitest theme 6/6; `npm run build` exit 0 (recorded in prior doc revision) |
| **Employee-chain only** (`PROF_E_INVITE_CHAIN_ONLY=1`, strict `trackPage`) | platform `ad9349b2fa07d0b2cff387c8950c33cdc91fb94a` · navigator `ecc798328e117394df52e4c0cf4ee246abf0b58c` | **PASS** — expected deny 1× GET wallet/settlements **403**; no unexpected BFF GET / console / page errors | `docs/prof-i-e-browser-report.json` (`runMode: invite-employee-chain-only`) |
| **teamCapabilities** contract (CLIENT manage A, no B, revoke, owner) | same pair `ad9349b` · `ecc79832` | **PASS** (PG integration) | navigator `src/lib/__tests__/prof-i-team-cabinet.integration.test.ts` |
| Profile cabinet gates from server caps | platform `ad9349b` | **PASS** (unit) | `src/lib/profile-cabinet-access.test.ts` |
| Navigator team scope unit tests | navigator `ecc79832` | **PASS** | `src/lib/__tests__/organizationTeamCabinet.test.ts` |
| **Full E repeated on candidate pair** | `ad9349b` · `ecc79832` | **NOT RUN** (by scope — chain + contract cover delta) | — |
| PG **28** / proxy **233** / component **124** suites | — | **NOT RUN** (no changes claimed in those areas) | — |
| PROF-I **SQL upgrade rehearsal** (synthetic post-H baseline) | navigator `ecc79832` SQL files | **PASS** (DDL only on `remcard_prof_i_upgrade_rehearsal`) | navigator `docs/PROF-I-RELEASE-MIGRATIONS.md` |
| Controlled **PROF-I migration preflight/apply** | — | **NOT SHIPPED** — **BLOCKER** | manifest `applyMechanism.releaseBlocker` |
| Production read-only preflight | — | **NOT VERIFIED** (operator) | handoff §A |
| Live auth, cards, storage, delivery | — | **NOT VERIFIED** | handoff §G |

## Historical notes (not superseded)

### Hydration (#418)

**Cause:** `ThemeProvider` client read of `data-theme` vs SSR `"light"` mismatch on `ThemeToggle`.  
**Fix:** defer resolved theme to mount effect; single storage read path.  
**Evidence:** vitest SSR string test + full E at `f5d749f` with empty console arrays.

### Scan-only CLIENT / spurious profile fetches

Gated platform profile fetches when cabinet access denies; employee-chain closed with harness `trackPage` and BFF GET error tracking.

### teamCapabilities

Navigator `GET /api/pro/context` exposes `teamCapabilities`; platform `deriveProfileCabinetAccess` uses server payload only. `employees-overview` scoped; empty scope → **403**. Moderation notes remain PRO-only.

## Commands (reference)

```bash
# Employee-chain (candidate pair)
PROF_E_INVITE_CHAIN_ONLY=1 PROF_E_PLATFORM_URL=http://127.0.0.1:3000 \
  node scripts/prof-i-e-integration-browser.mjs

# Team contract (navigator, remcard_prof_test)
pnpm exec vitest run src/lib/__tests__/prof-i-team-cabinet.integration.test.ts

# Platform cabinet access unit
pnpm exec vitest run src/lib/profile-cabinet-access.test.ts
```

## Verdict

**Integration candidate pinned** at runtime SHA pair above. **Not** a production go-ahead. Migration apply remains **BLOCKED** until controlled PROF-I scripts ship (see handoff + manifest).
