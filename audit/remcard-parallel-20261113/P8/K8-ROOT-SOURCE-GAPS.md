# П8 — K8 navigator source inspection (read-only)

**Canonical K8 tip:** `6f09c23e` (`cursor/remcard-k8-acceptance-20261113`)  
**Companion tips (Root):** K1 `f722a164` · K5 `6c444487`  
**Obsolete for gate:** `fc33b4fa` — Branch-required identity; **do not** score current gate against it.

**Profile prod `89fb8e07`:** publication in progress — **≠** Clients section ready.  
**Partner base:** `57ca4680` · **P8 product:** none · **G7 prod DB:** not started

**Inspected @ `6f09c23e`:** `contract.ts`, `IDENTITY_HANDOFF.md`, `HANDOFF.md`, `appealPurchaseProjection.ts`, `recordMap.ts`, `dto.ts`, `eligibility.ts`

---

## Identity @ `6f09c23e` (K8-GAP-6 — **CORRECTED in source**, not release)

| Requirement | Evidence |
|-------------|----------|
| `receivingPartnerUserId` required | `ClientAppealRecord`, create inputs, `ClientAppealReadContext` |
| Org/branch optional | `receivingOrganizationId` / `receivingBranchId` → `string \| null` |
| Settings keyed by principal | `ClientAppealPartnerSettingsRecord.receivingPartnerUserId` |
| Active slot | `(certificateId, receivingPartnerUserId)` partial unique (HANDOFF / IDENTITY) |

**Not section acceptance:** contract in navigator source only; partner proxy still `BLOCKED_CONTRACT`; no prod migration.

---

## Open blockers (current source)

### K8-GAP-7 — **Purchase read projection uses bonus payout** (new, Root assembly)

| | |
|---|---|
| **File** | `appealPurchaseProjection.ts` → `recordMap.ts` |
| **Current mapping** | `paidAmountKopecks` ← `rewardSummary(lifecycle).paid`; `paidAt` ← earliest `RewardPayment` `RECEIVED` |
| **Financial meaning** | `summary.paid` = **reward/bonus payouts** on `Order.rewardLifecycle`, not customer purchase total |
| **Prototype @ `3dc31836`** | `paidKopecksForAppeal` prefers `purchaseBreakdown.totalKopecks` / appeal purchase ledger — **client purchase** display |
| **Impact** | Receiving/observer columns show **wrong amount/date** vs prototype wallet/purchase vocabulary; risk of conflating payout with «Покупка: Оплачено» |
| **Constraint** | **No** change to `orderRewards` formulas or wallet mutations in Clients prep |
| **Owner** | **K8** read projection; **K1/K2** must not duplicate wrong field; align DTO labels with corrected source |
| **Next action** | Map read-only fields from **existing** order purchase total / accrual surfaces already used in prod UI (not `rewardSummary.paid`); keep `purchaseOrderId` on `PartnerClientAppeal.orderId` |

### K8-GAP-1 — Eligibility alignment (narrowed @ `6f09c23e`, integration open)

HANDOFF documents `requireOwnerClientsContext` + `principalAgentObserverOnly`; `eligibility.ts` uses principal viewer. **Residual:** org workplace vs principal on **receiving** routes (K1 `f722a164`) — P8 has not independently accepted K1 wiring.

### K8-GAP-2 — Settings scope (partial)

Schema + `PartnerClientAppealPartnerSettings` present @ `6f09c23e`. **Unresolved:** P2 org-wide vs per-branch (`client-appeals-settings-scope-8137.md`); K1 settings routes not P8-accepted.

### K8-GAP-3 — Active certificate (improved, verify with K1)

Principal-scoped unique index documented; confirm `createCertificateAppealIfNoneActive` + prototype `isActiveAppeal` in K1 integration.

### K8-GAP-4 — Scan → appeal (Root / K1)

`storeCertificateScan.ts` still outside K8 allowlist; certificate open journey not integrally verified.

### K8-GAP-5 — Observer DTO (improved @ `6f09c23e`)

`toObserverAppealDto` strips `privateNotes` / `clientContact`. **Residual:** K2 routes + partner adapter; GAP-7 leaks wrong finance into observer DTO if projection unfixed.

---

## Early handoff (unchanged owners)

| Consumer | Use | Avoid |
|----------|-----|-------|
| **K1** | `k1ReceivingApi.ts`, revised contract | Wrong `paidAmountKopecks` semantics |
| **K2** | `toObserverAppealDto` after projection fix | GET writes |
| **K5** | `6c444487` overlay contract | AgentClient substitute |
| **P2** | Adapter after K8 projection fix | Treat navigator as shipped API |
| **Root** | Selected files only; **G7** before DB apply | Whole-branch merge as acceptance |

---

## Release gate (summary)

| Gate | Status |
|------|--------|
| G1 schema draft @ `6f09c23e` | **IN_PROGRESS** — identity OK; **GAP-7** blocks accept |
| G2 safety | **BLOCKED** until GAP-7 + K1/K2 wire review |
| G3–G4 | **BLOCKED** |
| G5 prototype parity | **NO** (purchase projection) |
| G7 prod DB | **NOT_STARTED** |
| **Whole Clients** | **NO-GO** |

---

## P8 checks this pass

| Check | Result |
|-------|--------|
| Read K8 `contract.ts` + projection @ `6f09c23e` | **OK** — identity canonical; **GAP-7 reproduced** |
| Partner `contracts.test.ts` | **3/3 PASS** — still `BLOCKED_CONTRACT` on live fetch |
| Vitest (scoped) | `src/lib/clients-parity/contracts.test.ts` only |
