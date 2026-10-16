# R05 prototype → implementation mapping

| Prototype (frozen) | Implementation | Evidence |
|--------------------|----------------|----------|
| Agent wallet overview incoming tile | `AgentReceivablesHub` overview + `GET .../overview` | `agent-r05-incoming-tile` |
| Partners list grouped by partnerId/legal | `GET .../partners` + partner rows | `agent-r05-partner-row` |
| Partner → orders | `GET .../orders?partnerId=` | `agent-r05-orders` |
| Order breakdown lines | `GET .../orders/:id` + line table | `agent-r05-order-detail` |
| Ledger view density select | localStorage `agent-r05-receivables-prefs` | `ledger-view` |
| Search/filters collapsed | `<details>` block | `ledger-search`, `ledger-status` |
| Pagination 25/50/100 | query `pageSize` + meta | `ledger-pagination` |
| «Получил» / batch / XLSX | **Excluded** (R11–R13) | not rendered |
| DEMO_DATE / demo reset | **Excluded** | — |
| Payable / «Я должен» | **Excluded** for agent | legacy `SettlementsHub` when gate off |

Reference SHA: `roles.js` 0c9a8be6… (settlement-layout/analysis/order-detail).
