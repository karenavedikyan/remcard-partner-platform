# Partner prototype parity manifest

**Live reference (read-only):** `ecd465536e010ec42e7101258c6a2d3107b391b0` on `release/prof-v1-20261007`.  
**Rejected baseline:** `847526e07e890abd762a9bf4f229229c1b369016` (wrong wallet tabs + manifest cited unreachable `WalletAccrualsShell` as page root).  
Prototype remains **synthetic in-memory** — no API, payouts, DB, or deploy.

## Reachable production graph (wallet)

| Step | Published import chain (`src/app/settlements/page.tsx`) | Prototype module | Status |
| --- | --- | --- | --- |
| 1 | `resolveSettlementsPageShell` → `agent-r05` \| `master-wallet` \| `hub` | Role toolbar + `cabinet-sections.js` | **Synthetic** — same branch picks, no R05 HTTP |
| 2a | `AgentReceivablesWallet` → `WalletPrototypeShell` (tabs **Взаиморасчёты** / **Реквизиты**) | `renderWallet` tablist | **Matched** |
| 2b | `BusinessOwnerWallet` / `SpecialistMasterWallet` → `WalletPrototypeShell` | same | **Matched** |
| 2c | `SettlementsHub` (legacy hub shell) | Not on live path for store/company/agent in `page.tsx` (master-wallet / agent-r05) | **N/A (documented)** — hub obligations UI not duplicated; business roles use accruals workspace |
| 3 | Settlements tab → `WalletAccrualsWorkspace` | `wallet-accruals.js` inside settlements panel | **Matched layout** |
| 4 | Workspace subview `master-ledger` | `wallet-open-master-ledger` → `settlement-demo.js` + **← К кошельку** | **Matched** — real Excel via `settlement-export.js` / ExcelJS vendor |
| 5 | Workspace subview `agent-registry` → `AgentReceivablesHub` | `agent-receivables-registry.js` + `agent-receivables-export.js` | **Matched** — overview → partners → orders → detail; **real demo XLSX** for full current filter |
| 6 | Requisites tab | `renderBankDetails` | **Matched** (demo validation) |
| 7 | `/history` from workspace | `wallet-history-hub-link` → `partner-wallet-history.html` | **Matched (entry)** — full history SPA not cloned |
| 8 | Refresh notice / live payout errors | — | **N/A (documented)** — no network refresh or payout plumbing in prototype |
| 9 | Employee org branch merge | `Te()` + employee wallet denied card when `settlements` not granted | **Matched (reachable)** — org partners copy via `renderPartnersRedesign` `employee: true` when `terms` permission |

**Agent demo totals (coherent):** registry `agent-receivables-registry-data.js` and agent wallet card share **11 700 ₽** confirmed (7500+4200 open orders) and **5 000 ₽** awaiting confirmation (`ord-102`).

## Reachable production graph (partners)

| Step | Published (`src/app/partners/page.tsx`) | Prototype | Status |
| --- | --- | --- | --- |
| 1 | `resolvePartnersHubPresentation` → `AgentPartnersHub` or `PartnersHub` | Agent: `agent-partners-hub.js` + `partners-redesign.js` | **Matched (demo)** — find/link tabs, **dirty-close confirm**, **ready chrome** (tabs hidden, title «Приглашение создано») |
| 2 | `PartnersHub` zones | `renderPartnersRedesign` | **Matched layout** |
| 3 | `AgentPartnerCollection` | `compactPartnerCollection` + `collection` in `roles.js` | **Matched labels** |
| 4 | `PartnerPartnershipDetailDialog` | Partner detail in `roles.js` + `counterpartyProfileHtml` | **Matched** — readonly **Комментарий** when `partnershipNote` set (e.g. «Дом материалов») |
| 5 | Terms / pause / archive | `cooperation-controls.js` | **Matched meaningful flows** (demo) |
| 6 | Find / invite / link | Hub modal (agent) or `#role-dialog` (others) | **Matched paths** |

## Explicit non-goals (unchanged)

- Clients (`client-appeals.js`), scanner, privacy, R1/R2 procurement/care — prior QA policy.
- Production `src/`, backend, formulas, rights, config, publish.
- Claiming **ALL** site parity — history SPA depth, live refresh/errors, and legacy SettlementsHub remain out of scope.

## QA entry

`partner/roles.html` → role → **Кошелёк** / **Партнёры**.  
Agent wallet: **Реестр начислений агента**; Excel export must download `.xlsx`.  
Partner detail: open **Дом материалов** → **Комментарий** block.  
Agent invite: **Пригласить по ссылке** → edit field → close → discard confirm.  
Numbering: `?v=ann7` (`prototype-numbering.js`).
