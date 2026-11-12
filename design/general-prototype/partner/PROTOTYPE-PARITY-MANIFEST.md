# Partner prototype parity manifest

**Live reference (read-only):** commit `ecd465536e010ec42e7101258c6a2d3107b391b0` on `release/prof-v1-20261007`.  
**Not live:** `1d9bbeb6…` (unpublished). All flows remain **synthetic in-memory**; no API, payouts, or real account data.

## Wallet

| Published (src) | Prototype module | Parity |
| --- | --- | --- |
| `WalletPrototypeShell` tabs **Взаиморасчёты** / **Реквизиты** | `cabinet-sections.js` `renderWallet` | **Aligned** (company/store/specialist/agent) |
| `WalletAccrualsShell` inside settlements tab | `wallet-accruals.js` | **Aligned** — «Мне должны»/«Я должен», card confirmed/pending, quick **Ожидает**/**График**/**Выплачено**, history filters |
| History hub link `/history` | `wallet-history-hub-link` → `partner-wallet-history.html` | **Aligned entry** (demo page) |
| Extensions: master ledger | `wallet-open-master-ledger` → subview `settlement-demo` + **← К кошельку** | **Aligned** — search/filters, Excel весь отбор, направления, сверка |
| Extensions: agent registry | `wallet-open-agent-registry` → panel «Получено» | **Gap** — no full `AgentReceivablesHub` page |
| Role: agent `incomingOnly` | `incomingOnly` | **Aligned** |
| Employee / org scope | `allowed` / `Te()` | **Partial** — branch merge not modeled |
| Bank requisites | `renderBankDetails` | **Aligned** |
| Refresh notice / live payout errors | — | **Gap** — no server refresh banner |
| Standalone `partner-wallet-history.html` | Reference page | **Supplemental** — cabinet uses integrated history rail |

## Partners

| Published (src) | Prototype module | Parity |
| --- | --- | --- |
| `PartnersHub` (tiles, zones: active / decide / waiting) | `partners-redesign.js` → `renderPartnersRedesign` | **Aligned layout** |
| Find / invite / link flows | `hubFindShell`, `openPartnerInviteWizard`, `external-partner` | **Aligned (demo catalog)** |
| `AgentPartnersHub` modal composition | Shared redesign + agent copy in invite wizard | **Partial** — single shell; agent-specific hub modal split from prod not duplicated 1:1 |
| Partnership detail / terms / pause | `cooperation-controls.js` on collection rows | **Aligned meaningful flows** — terms edit, respond side, pause (demo) |
| `PartnerPartnershipDetailDialog` / CounterpartyProfile blocks | `counterpartyProfileHtml` + `Oa()` dialog + `coop.cardBlockHtml` | **Aligned demo** — О партнёре, направления (товары/услуги/этапы), география, контакт, ваше сотрудничество, copy ID, archive vs pause note |
| List toolbar 10/25/50, list/card, row actions | `collection` in `roles.js` | **Aligned labels** — Открыть карточку, Поделиться, Переименовать для себя, В архив, Убрать из списка, Изменить условия (`coop-list-actions`) |
| `AgentPartnerCollection` cards | `compactPartnerCollection` + `collection` renderer | **Aligned** |
| Legacy `cabinet-sections.renderPartners` (2 tabs) | **Unused** in `roles.js` (`renderPartnersRedesign` only) | **Retired from nav** — file kept for reference |

## Role-specific notes

| Role | Wallet | Partners |
| --- | --- | --- |
| Agent | Incoming-only accruals; registry shortcut (demo panel) | Full hub; invite copy agent-specific |
| Store / company / specialist | In+out accruals when allowed; settlements if `settlements` right | Hub + showcase search |
| Employee | Tabs filtered by `Te()`; denied state if no wallet rights | Org copy; `readOnly` collection without `terms` right |

## Explicit non-goals (unchanged)

- Clients (`client-appeals.js`) — prototype policy from prior QA.
- R1/R2: procurement/care only in release 2.
- Recommendations / outgoing certificates — legacy list for receiving roles (see `PROTOTYPE-NAV-COVERAGE.md`).
- Production `src/`, DB, deploy, estimate `a6ae55eb6d984880`.

## QA entry

Cabinet: `partner/roles.html` → role toolbar → **Кошелёк** / **Партнёры**.  
Numbering: `?v=ann3`; modals should keep reviewer chrome on top layer.
