# REMCLIENTS-V8-AUDIT-REMAINING

## Pins

| Role | SHA |
|---|---|
| **implCandidateSha / productFixSha** | `140de0a83044f324bf455ac2dfb87b17432fb8d1` |
| Author tip (Computer replay) | `a36c609b7ea7a43ce4f4ec544f7ad0e60b403447` |
| Production base (Gate/Context/route/helper/vitest must stay verbatim) | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| Prior audit content (V7) | `df794142516311827c8a475061a7dc13b789d4f8` |
| Stale productFixSha (do not use) | `5063368aea4a4219df354b0fcad7a0eaf9846ac8` |

## Computer V8 — accepted isolated only

Independent Computer on `a36c609b` / product `140de0a8`:

- 10 width×theme samples: 320/360/375/768/1024 × light/dark
- status/date same y (Computer: 281.5 both); no dead named tracks
- real client/back from partner / group / flat
- KPI/viewport checks; 2 observer files / 8 tests PASS

**Accepted only** those isolated regressions (maps to C29, C31, C42, C43, C46). **Not** whole-section acceptance.

## Handoff metadata defect

Author `src/lib/clients-parity/patch-manifest-57ca4680.json` at tip still has:

`productFixSha: 5063368aea4a4219…` (**stale V6**)

while `author-handoff-v6.json` already pins `140de0a8`. Author asked to correct. Auditor allowlist cannot edit product files — corrected copy:

`audit/clients-parity-20261113/v8-corrected-patch-manifest-57ca4680.json`

## Packaging gate (still FAIL)

Verified tip `a36c609b` vs EXACT `57ca4680`:

| Path | Result |
|---|---|
| `OwnerClientsGate.tsx` | FORBIDDEN_DELTA |
| `OwnerClientsModeContext.tsx` | FORBIDDEN_DELTA |
| `src/app/clients/page.tsx` | deleted on tip |
| `src/app/(cabinet)/clients/page.tsx` | forbidden route move on tip |
| `history-link-eligibility.ts` | deleted on tip (present on base) |
| `vitest.config.ts` | FORBIDDEN_DELTA |

Final manifest **exclude** list correctly leaves these untouched on apply — but tip itself still carries deltas, so section packaging remains FAIL. **No whole-branch transfer.**

## Contract inventory (read-only; no real account calls)

Backend tree: `karenavedikyan/remcard-navigator` @ `release/prof-backend-v1-20261007` (4217 paths, not truncated).

| Contract | BE hits | FE UI | Verdict |
|---|---|---|---|
| `/api/pro/client-appeals*` | **0** | `ReceivingAppealsBlocked.tsx` shell | **MISSING_SERVER** (UI shell present) |
| `working-stage*` | **0** | listed in blocked shell | **MISSING_SERVER** |
| `/api/pro/referred-appeals*` | **0** | observer UI + `fetchObserverReferredAppeals` → BLOCKED_CONTRACT | **MISSING_SERVER** (UI present) |
| `personal-meta` | **0** | edit panel Save disabled | **MISSING_SERVER** / **BLOCKED_PERSISTENCE** |
| `/api/pro/agent-clients*` | **6** routes | not used as personal overlay | **WRONG_SEMANTICS** for C35–C38 |
| `/api/store/orders/.../receiving-client` | **1** | order link only | unrelated to appeals CRM |

FE proxy (`src/lib/remcard-proxy.ts`): allowlists agent-clients* + receiving-client only.

## Counts (TOTAL=56)

`PASS_functional=5` · `PASS_safety=4` · `FAIL=10` · `BLOCKED_CONTRACT=23` · `BLOCKED_PERSISTENCE=4` · `NOT_STARTED=9` · `EXCLUDED=1`

`countCheck: 5+4+10+23+4+9+1=56`

## Honest remaining blockers

1. **FORBIDDEN packaging** until Gate/Context/route/history helper/vitest match `57ca4680` via selected-file apply only  
2. **BLK-RECEIVING-APPEALS** — no client-appeals/working-stages handlers (C07–C24)  
3. **BLK-OBSERVER-REFERRED** — no referred-appeals handlers (C27, C32, C34, C39–C40)  
4. **BLK-OBSERVER-PERSONAL-PERSIST** — no personal-meta; disabled Save ≠ PASS; do not map AgentClient delete (C35–C38)  
5. **Full visual/prototype pixel etalon** — still FAIL (C26, C28, C33, C44, C45, C47, C48)  
6. **NOT_STARTED** exercises — C04, C25, C30, C41, C49–C51, C53–C54  

Section remains **unaccepted**. Protected estimate not opened.
