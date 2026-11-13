# Whole-section unresolved matrix (P2 inventory)

**Root prepared source @ 2026-11-13 21:24 MSK:** K8 `8f4d336a`, K1 `a71b8f37`, K2 `c49d71dc`, K5 `6c444487`, P1 `2b2b32b8`, P4 `10c25fe6`, P6 wire `5092f756`.  
Prototype: `3dc31836`. **Section acceptance: BLOCKED** (prod DB, proxy live, mounted UI).

| Req / gap | Owner | Status | Precise fix |
| --- | --- | --- | --- |
| Observer scope + trash | K8+K2 | **RESOLVED** | `originKind CERTIFICATE`; no `deletedAt` on observer where @ 8f4d336a / c49d71dc |
| Observer public timeline | K2+K8 | **RESOLVED** | `projectObserverPublicHistory` @ c49d71dc detail GET |
| K2 route value exports | K2 | **RESOLVED** | `observerAccess.ts` @ c49d71dc |
| manualChannels persist | K8+K1 | **RESOLVED** | JSON `settings.manualChannels`; POST `kind: manualChannel`; VarChar(80) `manualSourceKey` |
| Certificate create opts | K8 | **RESOLVED** | `{ createdHistoryEvent? }` @ 8f4d336a — K1 wires only |
| List bucket vs tab | P6 | **RESOLVED** | Bucket mapper @ 5092f756 — UI mount unverified |
| P6 list envelope / pagination | P6 | UNRESOLVED | Split settings GET; server cursor pages |
| P6 payCategories UI | P6+profile | UNRESOLVED | Not on settings API — existing order/catalog + GAP-K8-N purchase read |
| Partner cards by principal | K2 | UNRESOLVED | `GAP-K8-P` partner meta |
| Personal meta HTTP | K5+P1 | DRAFT | Routes @ 86ac3e35; proxy allowlist |
| Batch trash/restore | K1 | UNRESOLVED | `GAP-K1-HTTP-BATCH-LIFECYCLE` |
| Purchase read / paidAt | K8+K2+P6 | PARTIAL | Existing Order projection — not new settlement |
| Prod DB / migrate | ROOT | BLOCKED | Separate user approval |
| Navigator env types | ROOT | KNOWN | 2 missing env type libraries on root assembly — not P2 partner tree |

P2 tip: `CLIENTS_ROOT_PREPARED_SOURCE_HANDOFF`, `CLIENTS_MANUAL_CHANNELS_WIRE`, `types.ts` settings.manualChannels.
