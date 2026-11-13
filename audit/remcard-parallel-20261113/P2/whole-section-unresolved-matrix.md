# Whole-section unresolved matrix (P2 inventory)

Pins: K8 `0f4fe833`, K1 `5a51d7b7`, K2 `df8ed8a5`, K5 `6c444487`, P1 `2b2b32b8`, P6 `4dca7af7`.  
Prototype: `3dc31836` (`client-appeals.js`, `observer-personal-list.js`).  
**Section acceptance: BLOCKED** — no prod DB, proxy live path, P6 mapper adoption.

| Req / gap | Owner | Status | Precise fix |
| --- | --- | --- | --- |
| Observer list incl. receiver trash | K2 | UNRESOLVED | Drop `deletedAt: null` on referrer scope (`GAP-K2-OBSERVER-DELETED-AT`) |
| Observer public timeline | K2+K8 | PARTIAL | `projectObserverPublicHistory` @ df8ed8a5; K8 `referrerPublicHistory` @ 0f4fe833 |
| Partner cards by principal | K2 | UNRESOLVED | `receivingPartnerUserId` not branch id (`GAP-K8-P`) |
| Personal meta HTTP | K5+P1 | DRAFT | `/referred-appeals/.../personal-meta` @ 86ac3e35; P5 wrong paths reject |
| List access + bucket wire | K1 | RESOLVED | `buildReceivingAccessEnvelope` + `bucket` query @ 5a51d7b7 |
| P6 merged list envelope | P6 | UNRESOLVED | Split list + `working-stages`; `normalizeK1ReceivingListHttp` |
| P6 pagination | P6 | UNRESOLVED | Server `cursor`/`limit`; no client-side bulk-all |
| P6 bucket vs tab | P6 | UNRESOLVED | Use response/query `bucket`; `tab` is incoming label only |
| P6 stage filter | P6 | UNRESOLVED | Query `stageKey` id, not label |
| P6 profile vs stage PATCH | P6+P1 | PARTIAL | K1 routes exist; P6 must split paths @ 4dca7af7 |
| P6 certificate entry | P6 | UNRESOLVED | `promoCode` + `valid:false` 200 |
| P6 wire renames | P6 | UNRESOLVED | `mapReceivingAppealWireToUiRow` (referrerProUserId, paidAmountKopecks) |
| Detail top-level history | P6 | UNRESOLVED | `normalizeK1ReceivingDetailHttp` |
| Settings version | P6 | UNRESOLVED | Mutate `{ settings, version }`; GET unwrap `settings.version` |
| Custom manual channels | K8 | SOURCE_GAP | Prototype overlay only — built-in `manualSourceKey` on wire |
| Pay categories UI | profile/K8 | OUT_OF_SCOPE | Not client-appeals API; no finance change in Clients prep |
| Batch trash/restore | K1 | UNRESOLVED | `GAP-K1-HTTP-BATCH-LIFECYCLE` |
| Purchase read unity | K8+K2 | PARTIAL | `paidAt` / order projection (`GAP-K8-N`) |
| Certificate create opts | K1 | IN_PROGRESS | `{ createdHistoryEvent }` — **K1 owned; P2 does not patch** |
| Prod DB / migrate | ROOT | BLOCKED | Separate user approval — no apply in this agent |

P2 deliverables this tip: `CLIENTS_NAVIGATOR_FIXED_ASSEMBLY`, `RECEIVING_P6_WIRE_DEFECTS`, `CLIENTS_PROTOTYPE_PARTNER_OVERLAY`, mappers in `types.ts`.
