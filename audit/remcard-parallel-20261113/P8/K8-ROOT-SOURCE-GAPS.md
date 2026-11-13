# П8 — Navigator source gaps ledger (current pins)

**Canonical assembly:** K8 `0f4fe833` · K1 `51353825` · K2 `df8ed8a5` · K5 `6c444487`  
**Schema SQL base:** `1894569a` (unchanged per Root) · **Obsolete pins:** `fc33`, pre-fix `6f09` reward projection

**Whole Clients:** **NO-GO** · **G7:** not started · **Partner @ `57ca4680`:** integration defects remain (see `GATE-REFRESH-20261113-1815.md`)

---

## Cleared (do not treat as current blockers)

| Gap | Resolution @ current pin |
|-----|---------------------------|
| K8-GAP-6 identity | `receivingPartnerUserId`; optional org/branch |
| K8-GAP-7 purchase | `Order.totalAmount` + `orderCountsAsClientPurchase`; `paidAt=null` |
| Referrer `deletedAt` | `buildObserverReferrerListWhere` excludes receiver archive filter |
| K2 duplicate mirrors | `df8ed8a5` → canonical `@/lib/clientAppeals/*` |
| Public history split | K8 `referrerPublicHistory` @ `594cb4ef`; K2 imports |

---

## Open server-side

### K8-GAP-4 — Scan → appeal (Root / K1)

Certificate open still via `storeCertificateScan.ts` — outside K8 write allowlist. **Criterion:** validated scan yields at most one active appeal per prototype predicate. **Next:** Root minimal wire proposal; K1 POST after validation.

### K1/K2 — Assembly not section acceptance

Source reviewed @ pins; **no** live API/DB verification. **Criterion:** G3 routes on profile backend after G7. **Next:** Root selects files; P8 re-gate after deploy stub only.

### P2 settings scope

Org-wide vs per-branch (`client-appeals-settings-scope-8137`) — unresolved in HANDOFF. **Owner:** P2. **Blocks:** settings UI envelope acceptance only.

---

## Partner-side (P8 does not own product fixes)

See **`GATE-REFRESH-20261113-1815.md`** — bucket/tab, promoCode, envelopes, revision, `paidAmountKopecks` UI, profile vs stage PATCH. **Owners:** P2, P4, P6.

---

## P8 checks

| Check | Result |
|-------|--------|
| Read-only GitHub @ `0f4fe833`, `df8ed8a5` | OK |
| Partner `contracts.test.ts` | Scoped vitest on P8 branch |
