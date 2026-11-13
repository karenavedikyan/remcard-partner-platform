# П5 — Publication residual (REM-PUBLISH-RESIDUAL-20261113-V2)

## Git

| | SHA / ref |
| --- | --- |
| Candidate base (parallel) | `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0` |
| Branch tip (pre-this-doc) | `c265ba6978b01b2536df2f9889a039a2aaa0380e` |
| Production navigator (external ref; not in this clone) | `3c37ca2557069a43544b7d72848fd53c37e3be5e` |
| Prototype freeze | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| **`BLOCKED_METADATA`** | Prior commits carry extra `Co-authored-by: Аведикян Карен` from platform; do not rewrite history |

## Selected diff for Root cherry-pick (П5 scope only)

**Product (minimal delta vs `9fa6cc42`):**

```text
src/components/clients/observer/ObserverPersonalConfirmPanel.tsx  (+5)
src/components/clients/observer/ObserverPersonalClientRow.tsx     (prototype tag/note labels)
```

**QA / audit (optional in publish bundle):**

```text
src/components/clients/observer/P5.*.test.tsx
audit/remcard-parallel-20261113/P5/**
```

**Do not cherry-pick** whole branch `cursor/remcard-p5-acceptance-20261113` — только файлы выше + уже существующие `observer/**` из manifest `includeForCherryPick`.

## Commands / evidence (2026-11-13)

```bash
npm run test:component -- src/components/clients/observer/P5.
# → 4 files, 18+ tests PASS (after row tweak)

npm run test:component -- src/components/clients/observer/ObserverPartnersListView.test.tsx
# → 7 tests PASS (orchestration read-only; not page acceptance)
```

**Browser / page:** **NOT_VERIFIED**

План (Root или П5+mock egress): `next dev` на fixture-only странице с `displayPersonalMeta` prop; MSW блокирует любой `PATCH *personal*`; сценарии: select-all → edit → cancel (поля сброшены), archive confirm → notice без смены bucket counts. Скриншоты — `audit/remcard-parallel-20261113/P5/` (не созданы в этой сессии).

## UI vs backend — publication blockers

### Ready for UI publish (honest blocked persistence)

| Criterion | Evidence | Status |
| --- | --- | --- |
| Row checkbox one | `P5.ObserverPersonalClientRow` | **UI PASS** |
| Toolbar all/mixed/clear | `P5.ObserverPersonalTools` + prototype `data-observer-select-all` | **UI PASS** |
| Bucket actions active/archive/trash | Toolbar button matrix | **UI PASS** |
| Edit single/bulk, cancel, draft reset | `P5.ObserverPersonalEditPanel` + integration cancel test | **UI PASS** |
| Save | `disabled`, `Сохранить (недоступно)`, `title=BLOCKED_PERSISTENCE` | **UI PASS (blocked)** |
| Confirm copy archive/trash/restore | `P5.ObserverPersonalConfirmPanel` | **UI PASS** |
| Confirm click | Parent `notifyPersistenceBlock` + notice — **no list mutation** | **UI PASS (blocked demo)** |
| Prototype tag/note labels (flat vs grouped) | `ObserverPersonalClientRow` vs `observer-personal-list.js` | **UI PASS** (this residual) |

### Not publishable until backend / siblings

| Blocker | Owner | Next action |
| --- | --- | --- |
| **BLK-OBSERVER-PERSONAL-PERSIST** (C35–C38) | API + parent loader | Ship `PATCH …/personal-meta` + batch; wire save/confirm to API; enable save button when `ok` |
| **BLK-OBSERVER-REFERRED** (C26–C34, data) | API + fetch owner | List endpoints; remove `BLOCKED_CONTRACT` empty states |
| Stale selection prune on filter/search | `ObserverPartnersListView` | Mirror prototype `selected.filter(visibleIds)` each render |
| Restore without confirm vs prototype direct apply | `ObserverPartnersListView` | Product choice: keep confirm or match prototype one-click restore |
| Partner group checkbox `data-observer-group` | `ObserverPartnerCard` | Partial/indeterminate group select |
| Post-action undo notice | Parent state | Prototype `undo`; needs persisted `lastChange` — blocked without API |
| `vitest.config.ts` include `P5.*` | Root/infra | Add pattern or CI explicit path |
| Page/visual acceptance C42/C48 | П7 + audit | CSS tokens + screenshots ≠ component PASS |
| `3c37ca25` shell regression | Root | Merge navigator release + parity observer subtree only |

### Forbidden publication claims (`patch-manifest-57ca4680`)

- C35 save, C36 bulk tag save, C37 archive/trash/restore **persistence**
- `fetchObserverReferredAppeals ok:true`

## П5 residual delta in this follow-up

- `ObserverPersonalClientRow.tsx`: flat list shows tag without prefix; grouped — «Моя метка:/заметка:» (prototype `observer-personal-list.js`).
- This markdown + retest log.

## Assigned unresolved work (by role)

1. **Root** — cherry-pick П5 product files onto release line atop `3c37ca25` shell; package; attach manifest row «П5 UI blocked-persistence».
2. **API** — implement `CLIENTS_CONTRACT_BLOCKERS[BLK-OBSERVER-PERSONAL-PERSIST].missingApi`.
3. **Observer list owner (not П5)** — stale selection, restore UX, undo, wiring confirm/save when API ready.
4. **П5** — after API: enable `ObserverPersonalEditPanel` save + `ConfirmPanel` confirm via props from parent (parent change required).
