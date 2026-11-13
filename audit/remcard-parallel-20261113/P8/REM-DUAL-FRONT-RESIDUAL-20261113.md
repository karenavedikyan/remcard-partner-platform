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
| P1 | `2b2b32b8beb62…` | `POST /api/pro/client-appeals/batch` on allowlist **@ this commit** |
| P2 | (coordination) | Envelopes / `409` — not re-audited this pass |
| P3 | — | Observer shell on **P8 branch** still proxy-blocked |
| P4 | `10c25fe6` | **NOT_VERIFIED** on `origin` (SHA not fetched); handoff received per user |
| P5 | `ca2855fb` | `ReceivingBulkActions` + `receiving-bulk-handoff.ts` **owned** |
| P6 | **`78fd46e7`** (not stale `5092f756`) | Parent chain includes `5092f756` wire fix |
| P7 | — | Nav/shell — not expanded this pass |
| P8 | `0bb47714…` | Audit only |

### P6 vendored P5 files (ownership)

@ `78fd46e7`, P6 workspace commit **adds/mounts** `ReceivingBulkActions.tsx` and `receiving-bulk-handoff.ts` (content from P5 @ `ca2855fb`). **Root** must select by **path owner** (P5 originals + P6 mount wiring), not whole P6 commit metadata (Cursor Agent author).

---

## Cleared (prior P8 claims — only after reading current source)

| Was claimed / stale | Current @ `78fd46e7` + К pins |
|---------------------|-------------------------------|
| List query **`tab`** | **Cleared:** `buildReceivingAppealsListQuery` sets **`bucket`**; comment names K1 `bucket` + `stageKey` |
| Bulk **BLOCKED_PERSISTENCE** stubs on archive/trash | **Cleared in source:** confirm panel + `postReceivingAppealsBatch`; `edit-open` still notice-only |
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

### On **owner source @ P6 `78fd46e7`** (synthetic review possible **without** G7 — **NOT_VERIFIED** browser)

| Surface | State | Remaining |
|---------|--------|-----------|
| Incoming workspace | `ReceivingAppealsWorkspace` mounted in `ClientsDirectionWorkspace` | **Not on prod branch** until Root file publish |
| List / filters | Server `bucket`, pagination, settings unwrap | **NOT_VERIFIED** mounted |
| Bulk toolbar | P5 UI mounted; `contractState: blocked` when `!isReceivingBatchProxyReady()` | On **P8 branch** proxy lacks batch → actions disabled; on **P1 `2b2b32b8`** batch path exists — integration gap |
| Bulk **edit-open** | Notice only | **OPEN:** multi PATCH panel — **P4/P5/P6** |
| Detail | `ReceivingAppealDetailHost` → P4 envelope bridge | **NOT_VERIFIED** stage/notes/history vs `3dc31836` |
| Settings | `WorkingStagesEditor` + manual channels | **NOT_VERIFIED** POST working-stages + K8 `manualChannels` |
| Certificate scan | `ReceivingCertificateScan` + `promoCode` wire @ `5092` lineage | **NOT_VERIFIED** scan journey |
| Observer personal | P5 adapter paths | **NOT_VERIFIED** on latest P3/P5 tips vs `57ca4680` |

---

## Per-owner publication blockers (concise)

| Owner | Blocker | Next action |
|-------|---------|-------------|
| **Root** | Select files; no whole-branch merge; К2 commit metadata | Publish to `57ca4680` after independent accept + **G7** for DB |
| **P1** | Prod branch behind `2b2b32b8` allowlist | Land proxy manifest on integration branch Root picks |
| **P2** | Types/envelopes/revision | Align detail + list wire with frozen К contract |
| **P3/P5** | Observer personal proxy + persist | K5 routes + no cross-adapter |
| **P4** | Detail stage/notes controls @ `10c25fe6` | Mount + **NOT_VERIFIED** parity |
| **P6** | `78fd46e7` ahead of prod; bulk edit; P5 file vendoring | Finish edit-panel; Root splits P5 vs P6 paths |
| **P7** | Cabinet numbering 5–13 unchanged scope | Shell only when Root selects |
| **P8** | Gate / residual docs | No product commits |
| **User** | **G7** prod DB | Separate from offline UI review |

---

## Independence / checks this pass

| Check | Result |
|-------|--------|
| `git show 78fd46e7` receiving + bulk + `bucket` query | Read OK |
| `git show 2b2b32b8` batch allowlist | Present |
| P8 branch incoming panel | Still **`ReceivingAppealsBlocked`** |
| `contracts.test.ts` | **3/3** (local scaffold only) |
| Browser / live API / DB | **NOT_VERIFIED** |

**FINISHED** on this document = audit refresh only, **not** page acceptance.
