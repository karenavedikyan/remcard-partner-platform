# REM-DUAL-FRONT-RESIDUAL-20261113 (П8 read-only gate)

**Base / prod:** partner `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` · navigator profile `89fb8e073c39c8dbd329996940b85c6a86751868`  
**P8 audit tip:** (this commit) · **Prototype:** `3dc31836` · **Clients publication:** **not authorized** · **G7:** separate from synthetic UI review

---

## Backend SOURCE-PREP — **FROZEN** (К)

| Owner | SHA | P8 status |
|-------|-----|-----------|
| К8 | `8f4d336ad44906de042ca6c15c8f581d6ba8686c` | No further schema/SQL unless Root cites defect |
| К1 | `a71b8f37f526d775cd99f0535705be678b72261e` | — |
| К2 | `c49d71dceae8e221fc3e321056b091d7e3347be5` | Metadata: **do not cherry-pick** commit; file-select only |
| К5 | `6c4444879d5651679c969b8009b3f39d05302c43` | — |

Prepared pins intact. **≠** mounted page acceptance. **≠** prod DB apply.

---

## Partner UI owner pins (read @ git show)

| Owner | Tip | Notes |
|-------|-----|--------|
| P1 | **`0bb25b9b`** | List, `POST …/batch`, detail `PATCH`, `…/stage`, working-stages, certificate-entry **in source** |
| P2 | (coordination) | Envelopes / `409` — not re-audited this pass |
| P3 | — | Observer shell on **P8 branch** still proxy-blocked |
| P4 | **`497f313d`** | `buildReceivingAppealDetailReady` in `receiving-detail-actions-contract.ts` |
| P5 | **`1298491f`** (after `ca2855fb`) | `ReceivingBulkActions`, `ReceivingBulkEditPanel`, `ReceivingBulkConfirmPanel`, `receiving-bulk-handoff.ts` |
| P6 | **`3d6c7637`** (current; not `78fd46e7`/`5092` alone) | Workspace/transport — **Root rejects duplicate P5 paths @ this tip** |
| P7 | — | Nav/shell — not expanded this pass |
| P8 | audit tip | Audit only |

### Root ownership correction @ `3d6c7637` (rejected workaround — selective handoff)

| Path | Owner (take) | @ `3d6c7637` problem |
|------|----------------|----------------------|
| `receiving-bulk-handoff.ts` | **P5** `1298491f` | P6 vendored / duplicated → **do not take P6 copy** |
| `ReceivingBulkActions.tsx` | **P5** `1298491f` | P6 renamed to `ReceivingBulkToolbar` + duplicated contract |
| `receiving-bulk-contract.ts` | **P5** handoff (+ P2 types) | P6 copy under `clients-parity` — **reject**; use P5 `receiving-bulk-handoff.ts` |
| `ReceivingBulkEditPanel.tsx` | **P5** `1298491f` only | **Same path** re-added by P6 — **Root rejects** P6 file; wire P5 panel |
| `ReceivingBulkConfirmPanel.tsx` | **P5** `1298491f` | P6 uses inline confirm in workspace — prefer P5 panel on publish |
| `receiving-bulk-apply.ts` | **P6** | OK — transport (`applyReceivingBulkEditsPerId`) |
| `ReceivingAppealsWorkspace.tsx` | **P6** | OK — orchestration after corrective import |
| `receiving-appeals-api.ts` | **P6** | batch POST client |

**Not** whole-branch reject of P6 — only duplicate paths above until P6 decouples to P5 imports + P6 transport/host.

---

## Cleared (prior P8 claims — only after reading current source)

| Was claimed / stale | Current @ P6 `3d6c7637` + К pins |
|---------------------|-------------------------------|
| List query **`tab`** | **Cleared:** `buildReceivingAppealsListQuery` sets **`bucket`**; comment names K1 `bucket` + `stageKey` |
| Bulk **BLOCKED_PERSISTENCE** stubs on archive/trash | **Cleared in source:** confirm panel + `postReceivingAppealsBatch` |
| P1 “missing batch/detail proxy” | **Cleared @ `0bb25b9b`** — **57ca4680** integration still open |
| P6 bulk edit “notice only” @ `78fd46e7` | **Superseded in source intent** @ `3d6c7637` — Root must take **P5** panel path, not P6 duplicate |
| Backend reward-as-purchase | **Cleared** @ К lineage `0f4fe833`+ (frozen) |

**Not cleared:** whole-section PASS; browser parity; prod `57ca4680` integration.

---

## What remains on partner **client UI** (Клиенты cabinet)

### On **production base @ P8 branch** (`57ca4680` delta not merged)

| Surface | State | User-visible |
|---------|--------|--------------|
| Direction **incoming** | `ReceivingAppealsBlocked` | «Клиенты ко мне» — blocked shell, not `ReceivingAppealsWorkspace` |
| Direction **observer** | `ObserverPartnersWorkspace` + list | Loads; personal save → **BLOCKED_PERSISTENCE** without K5 proxy path on this branch |
| Proxy / API | `contracts.test` **3/3** | Live fetch still **BLOCKED_CONTRACT** vs navigator |

### On **owner source @ P6 `3d6c7637`** (synthetic review possible **without** G7 — **NOT_VERIFIED** browser)

| Surface | State | Remaining |
|---------|--------|-----------|
| Incoming workspace | `ReceivingAppealsWorkspace` mounted in `ClientsDirectionWorkspace` | **Not on prod branch** until Root file publish |
| List / filters | Server `bucket`, pagination, settings unwrap | **NOT_VERIFIED** mounted |
| Bulk toolbar / batch | P5 @ `1298491f` + P6 mount | On **P8 prod branch** proxy still blocked; **P1 `0bb25b9b`** source has batch+PATCH — **integration** to `57ca4680`, not missing route |
| Bulk **edit-open** | P6 @ `3d6c7637` local panel + transport | **Root:** use P5 `ReceivingBulkEditPanel` + P6 `receiving-bulk-apply.ts`, not P6 duplicate panel path |
| Detail | `ReceivingAppealDetailHost` | **OPEN:** wire `buildReceivingAppealDetailReady` @ P4 `497f313d` (host lacked `actions`) — **NOT_VERIFIED** browser |
| Settings | `WorkingStagesEditor` + manual channels | **NOT_VERIFIED** POST working-stages + K8 `manualChannels` |
| Certificate scan | `ReceivingCertificateScan` + `promoCode` wire @ `5092` lineage | **NOT_VERIFIED** scan journey |
| Observer personal | P5 adapter paths | **NOT_VERIFIED** on latest P3/P5 tips vs `57ca4680` |

---

## Per-owner publication blockers (concise)

| Owner | Blocker | Next action |
|-------|---------|-------------|
| **Root** | Select files; no whole-branch merge; К2 commit metadata | Publish to `57ca4680` after independent accept + **G7** for DB |
| **P1** | `0bb25b9b` source ready; **57ca4680** not merged | Root selective publish of `remcard-proxy.ts` — **not** “missing endpoints” |
| **P2** | Types/envelopes/revision | Align detail + list wire with frozen К contract |
| **P3/P5** | Observer personal proxy + persist | K5 routes + no cross-adapter |
| **P4** | `497f313d` action builder | P6 host wires `buildReceivingAppealDetailReady`; paid-review callback still absent by design |
| **P5** | `1298491f` panels/handoff | Root must win on duplicate paths vs P6 `3d6c7637` |
| **P6** | `3d6c7637` | Decouple duplicates → import P5; keep workspace/transport; detail host actions |
| **P7** | Cabinet numbering 5–13 unchanged scope | Shell only when Root selects |
| **P8** | Gate / residual docs | No product commits |
| **User** | **G7** prod DB | Separate from offline UI review |

---

## Independence / checks this pass

| Check | Result |
|-------|--------|
| `git show 3d6c7637` workspace + bulk transport | Read OK; **duplicate P5 paths flagged** |
| `git show 0bb25b9b` client-appeals allowlist | batch + detail routes present |
| `git show 1298491f` / `497f313d` | P5 panels + P4 detail actions |
| P8 branch incoming panel | Still **`ReceivingAppealsBlocked`** |
| `contracts.test.ts` | **3/3** (local scaffold only) |
| Browser / live API / DB | **NOT_VERIFIED** |

**FINISHED** on this document = audit refresh only, **not** page acceptance.
