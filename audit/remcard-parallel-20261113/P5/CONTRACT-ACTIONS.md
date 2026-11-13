# П5 — action-by-action contract (observer personal overlay)

P2 source of truth: `CLIENTS_CONTRACT_BLOCKERS` (`BLK-OBSERVER-PERSONAL-PERSIST`). Until P2 ships **confirmed** route shapes, all rows default to `persistenceStatus=blocked` in owned UI.

| # | User action | Prototype ref | Owned UI | API (P2/backend) | Parent/orchestrator | Publication |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Toggle one row | `data-observer-id` | `ObserverPersonalClientRow` checkbox | — | holds `Set<id>` | UI ready |
| 2 | Select all visible | `data-observer-select-all` + mixed | `ObserverPersonalTools` | — | `onSelectAll`, stale prune† | UI ready / †parent |
| 3 | Clear selection | `clear` | toolbar button | — | `onClearSelection` | UI ready |
| 4 | Bucket active/archive/trash | `bucket:*` | bucket buttons | — | filter + clear selection | UI ready |
| 5 | Layout partners/list | `layout:*` | layout toggle | — | `setLayout` | UI ready |
| 6 | Bulk edit open | `edit` | toolbar / row | — | `panel edit` + `ids` | UI ready |
| 7 | Single edit open | `edit:id` | row button | — | `panel edit` single | UI ready |
| 8 | Edit cancel | `cancel` | `ObserverPersonalEditPanel` | — | `setPanel(null)` | UI ready |
| 9 | Edit draft reset | `initial` change | `useEffect` on `initial` | — | reopen with server meta | UI ready |
| 10 | Save single | submit form | `onSave(draft)` when `ready` | `PATCH …/:id/personal-meta` | wire status + errors | **BLOCKED** |
| 11 | Save bulk tag | submit | `onSave({tag})` when `ready` | `POST …/personal-batch` | bulk ids + partial | **BLOCKED** |
| 12 | Archive ask | `move:archived` | toolbar | — | confirm panel | UI ready |
| 13 | Trash at-self ask | `move:trash` | toolbar | — | confirm panel | UI ready |
| 14 | Restore ask | `restore` | toolbar (non-active) | — | confirm panel | UI ready |
| 15 | Confirm move | `confirm` | `onConfirm` when `ready` | batch bucket update | mutation + partial UI | **BLOCKED** |
| 16 | Stale selection | prune hidden ids | hint `selectionOutsideView` | — | pass `selected.size - inView` | UI ready / parent wire |
| 17 | Partial failure | notice + retry | `saveError` / `partialError` | 207/multi-status TBD by P2 | set `error` + message | **BLOCKED** contract |
| 18 | Per-user isolation | meta per appeal id | display only | auth scope referrer | no AgentClient CRUD | **BLOCKED** API |

† Prototype: `p.selected = p.selected.filter(visibleIds)` on each render — **not** owned; list owner must implement.

## `ObserverPersonalPersistenceStatus`

- `blocked` (default): save/confirm disabled, labels `*(недоступно)*`.
- `ready`: enable primary actions; parent passes `onSave` / `onConfirm` that call API only after P2 proof.
- `pending`: disable primaries, «Сохранение…» / «Выполняется…».
- `error`: show `saveError` / `partialError`; primaries re-enabled for retry.

## Not whole-feature acceptance

Disabled save/confirm honest UX ≠ C35–C38 PASS. Section publish requires P2 routes + referred list + parent wiring.
