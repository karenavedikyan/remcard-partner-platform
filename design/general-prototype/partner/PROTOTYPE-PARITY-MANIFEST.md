# Partner prototype parity manifest

**Live reference (read-only):** `ecd465536e010ec42e7101258c6a2d3107b391b0` on `release/prof-v1-20261007`.  
**Rejected baseline:** `847526e07e890abd762a9bf4f229229c1b369016` (wrong wallet tabs + manifest cited unreachable `WalletAccrualsShell` as page root).  
Prototype remains **synthetic in-memory** — no API, payouts, DB, or deploy.

## Reachable production graph (wallet)

| Step | Published import chain (`src/app/settlements/page.tsx`) | Prototype module | Status |
| --- | --- | --- | --- |
| 1 | `resolveSettlementsPageShell` → `agent-r05` \| `master-wallet` \| `hub` | Role toolbar + `cabinet-sections.js` | **Synthetic** — same branch picks, no R05 HTTP |
| 2a | `AgentReceivablesWallet` → `WalletPrototypeShell` (tabs **Взаиморасчёты** / **Реквизиты**) | `renderWallet` tablist | **Matched** — no separate «Бонусы и начисления» tab |
| 2b | `BusinessOwnerWallet` / `SpecialistMasterWallet` → `WalletPrototypeShell` | same | **Matched** |
| 2c | `SettlementsHub` (legacy hub shell) | Not default for store/company on live; prototype uses accruals workspace for business roles | **Partial** — hub obligations UI not duplicated for non-business roles on hub shell |
| 3 | Settlements tab → `WalletAccrualsWorkspace` (not imported by `page.tsx` directly) | `wallet-accruals.js` inside settlements panel | **Matched layout** — Мне должны / Я должен, cards, quick **Ожидает** / **График** / **Выплачено\|Получено**, history filters |
| 4 | Workspace subview `master-ledger` → specialist ledger frame | `wallet-open-master-ledger` → `settlement-demo.js` + **← К кошельку** | **Matched demo** — filters, Excel label, reconciliation entry |
| 5 | Workspace subview `agent-registry` → `AgentReceivablesHub` | `wallet-open-agent-registry` → `agent-receivables-registry.js` | **Matched demo** — overview → partners → orders → order detail, filters, pagination, Excel stub, back |
| 6 | Requisites tab → `AgentPayoutRequisitesPanel` / business requisites | `renderBankDetails` | **Matched** (demo validation) |
| 7 | `/history` from workspace | `wallet-history-hub-link` → `partner-wallet-history.html` | **Entry only** |
| 8 | Refresh notice / live payout errors | — | **Gap** |
| 9 | Employee org branch merge | `Te()` / denied card | **Partial** |

## Reachable production graph (partners)

| Step | Published (`src/app/partners/page.tsx`) | Prototype | Status |
| --- | --- | --- | --- |
| 1 | `resolvePartnersHubPresentation` → `shared-r04` + `AgentPartnersHub` or `PartnersHub` | Agent: `agent-partners-hub.js` modal + `partners-redesign.js`; others: redesign shell | **Partial** — agent modal find/link; invite dirty-guard / ready chrome not 1:1 |
| 2 | `PartnersHub` zones (active / decide / waiting), tiles | `renderPartnersRedesign` | **Matched layout** |
| 3 | `AgentPartnerCollection` list/card, 10/25/50, row menus | `compactPartnerCollection` + `collection` in `roles.js` | **Matched labels** |
| 4 | `CounterpartyProfile` + `PartnerPartnershipDetailDialog` | `counterpartyProfileHtml` + detail dialog in `roles.js` | **Matched demo sections** — О партнёре, направления, география, контакт, сотрудничество, copy ID, archive vs pause |
| 5 | Terms / pause / archive flows | `cooperation-controls.js` | **Matched meaningful flows** (demo) |
| 6 | Find / invite / link | Hub modal (agent) or `#role-dialog` (others) | **Matched paths** (demo catalog) |

## Explicit non-goals (unchanged)

- Clients (`client-appeals.js`), scanner, privacy, R1/R2 procurement/care — prior QA policy.
- Production `src/`, backend, formulas, rights, config, publish.
- Claiming **ALL** parity — gaps above remain until closed.

## QA entry

`partner/roles.html` → role → **Кошелёк** / **Партнёры**.  
Store/company wallet: default **Взаиморасчёты** tab only. Agent: **Реестр начислений агента** opens dedicated registry subview (not «Получено» panel).  
Numbering: `?v=ann5`.
