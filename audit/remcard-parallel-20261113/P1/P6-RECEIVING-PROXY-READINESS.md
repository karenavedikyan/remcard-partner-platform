# P6 — receiving proxy readiness (P1 source truth)

**P6 handoff tip:** `78fd46e70fa6cd5b1eb08aa79a9554505a121c00`  
**Partner proxy pin:** `0bb25b9b` / `2b2b32b8` lineage — `remcard-proxy.ts` **unchanged** this turn  
**Production `57ca4680`:** receiving product UI **absent**; proxy source-prep ≠ mounted pages  
**K1 frozen:** `a71b8f37f526d775cd99f0535705be678b72261e`

## `isReceivingBatchProxyReady()` @ 78fd46e7

P6 `src/lib/clients-parity/receiving-appeals-api.ts` (P6 commit — **do not cherry-pick from P6 into P1**):

```ts
return isAllowedProxyRoute("POST", "/api/pro/client-appeals/batch");
```

At P1 tip **`2b2b32b8` / current branch** this returns **`true`** in-process (`tsx --test src/components/clients/P1.receiving-proxy-readiness.test.ts`).  
P6 handoff doc still says "Blocked until P1" — **stale**; P6 should drop `contractState: "blocked"` for batch when integrating P1 proxy, **without** hardcoding success without `isAllowedProxyRoute`.

## Prepared receiving slice (Root assignment)

| Check | Path | Allowlisted @ P1 |
|-------|------|------------------|
| Detail read | `GET …/client-appeals/:id` | yes |
| Detail profile save | `PATCH …/client-appeals/:id` | yes @ K1 a71b8f3 |
| Bulk | `POST …/client-appeals/batch` | yes |
| Settings read | `GET …/working-stages` | yes |
| Settings add | `POST …/working-stages` | yes |

**Not invented:** `PATCH` detail before K1 export was correct; now wired.

## Still blocked (honest)

| Item | Reason |
|------|--------|
| Production navigator DB | migrate not approved — `503` / schema unavailable |
| Bulk edit multi-panel | P4/P5 — not proxy |
| Certificate scan open | `certificate-entry` 501 until Root scan hook |
| Observer personal save | needs K5 + DB overlay |

Transport allowlist ≠ page acceptance.

## P5 bulk ownership

See `P6-P5-VENDOR-EXCLUSION.md` — `ReceivingBulkActions.tsx` / `receiving-bulk-handoff.ts` @ P5 `ca2855fb`, not P6-owned blobs in 78fd46e7.
