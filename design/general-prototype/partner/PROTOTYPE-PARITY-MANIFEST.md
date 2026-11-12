# Partner prototype parity manifest

**Live reference (read-only):** commit `ecd465536e010ec42e7101258c6a2d3107b391b0` on `release/prof-v1-20261007`.  
**Not live:** `1d9bbeb6…` (unpublished). All flows remain **synthetic in-memory**; no API, payouts, or real account data.

## Wallet

| Published (src) | Prototype module | Parity |
| --- | --- | --- |
| `WalletAccrualsShell` / `WalletAccrualsWorkspace` | `wallet-accruals.js` via `cabinet-sections.js` → default tab **Бонусы и начисления** | **Aligned presentation** — direction toggle, edition selector, receivable/payable cards, history rail, detail dialogs, client purchase drill-down, scenario selector |
| History link / filters | `renderHistoryPanel`, `history-filter:*` | **Aligned** (demo data) |
| Role: agent `incomingOnly` | `incomingOnly` + hidden outbound UI | **Aligned** |
| Employee / org scope | Demo scenarios + rights via `allowed` / `Te()` | **Partial** — org/staff **scope keys** from prod not fully modeled; rights gate tabs and settlements |
| Extensions: master ledger | `wallet-open-master-ledger` → вкладка «Взаиморасчёты» | **Aligned navigation** |
| Extensions: agent registry | `wallet-open-agent-registry` → panel «Получено» (demo) | **Gap** — no dedicated agent registry page like prod |
| `SettlementsHub` / ledger | `settlement-demo.js` (вкладка «Взаиморасчёты») | **Aligned core flows** — partner drill-down, batch pay, reconciliation, OTP demo |
| Bank requisites in wallet | `renderBankDetails` | **Aligned** |
| Refresh notice / live payout errors | — | **Gap** — no server refresh banner |
| Standalone `partner-wallet-history.html` | Reference page | **Supplemental** — cabinet uses integrated history rail |

## Partners

| Published (src) | Prototype module | Parity |
| --- | --- | --- |
| `PartnersHub` (tiles, zones: active / decide / waiting) | `partners-redesign.js` → `renderPartnersRedesign` | **Aligned layout** |
| Find / invite / link flows | `hubFindShell`, `openPartnerInviteWizard`, `external-partner` | **Aligned (demo catalog)** |
| `AgentPartnersHub` modal composition | Shared redesign + agent copy in invite wizard | **Partial** — single shell; agent-specific hub modal split from prod not duplicated 1:1 |
| Partnership detail / terms / pause | `cooperation-controls.js` on collection rows | **Aligned meaningful flows** — terms edit, respond side, pause (demo) |
| Counterparty profile surface | Cooperation dialog + legal blocks in settlement/partners rows | **Partial** — prod `CounterpartyProfile` composite (ECD) not a separate route; prototype uses cooperation panel + ledger legal captions |
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
