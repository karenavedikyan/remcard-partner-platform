# Partner prototype · navigation coverage (R1 default)

Legend: **Module** = routed through cabinet shell (`roles.js`) into an existing prototype module. **Legacy** = `legacyLa()` stub or dialog-only path. **R2** = visible only with «Релиз → R2» (`rc_release` / `?rc_demo_release=2`).

| Section | Specialist | Store | Company | Agent | Employee |
| --- | --- | --- | --- | --- | --- |
| Home | Module | Module | Module | Module | Module (rights-based; no R2 teasers in R1) |
| Clients | Module (`client-appeals.js`) | Module | Module | Module (sender-only / observer opt-in) | Module if `clients` |
| Partners | Module (`partners-redesign.js`) | Module | Module | Module | Module if terms/scan/sale |
| Recommendations / outgoing certs | Legacy list + `action:recommend` wizard | Legacy + recommend | Legacy + recommend | Module (cert list + recommend) | Legacy if `clients` |
| Scanner (receive cert) | Module via `client-appeals` scan | Module | Module | — (not in nav) | Module if scan/sale |
| Wallet / bonus / settlements | Module (`wallet-accruals.js` default tab + `settlement-demo.js`) | Module | Module | Module (incoming-only) | Module if bonus/history/settlements rights |
| Purchases / operations detail | Module (appeal `purchase` + wallet txn panels) | Module | Module | Module (wallet → client-open) | Module |
| Profile | Module (`profile-wizard.js`) | Module | Module | Module | Module |
| Team / employee invites | — | links | links / team | — | profile tab if `team` |
| Закупки | R2 · `procurement.js` | R2 | R2 | R2 | R2 if terms/catalog |
| Забота RemCard | R2 · `care-services.js` | R2 | R2 | R2 | R2 if terms/catalog/sale |

## Scanner wiring (this pass)

- Sidebar / mobile **Сканер** → `openClientAppealsScanFlow()` → `primeClientAppealsScan` → full scan UI (outcomes, appeal, categories, pay/delay).
- Home CTA «Проверить сертификат» / employee hero / empty-state `action:scan` → same flow (no legacy dialog).
- Back from scan entry: **К рабочим разделам** → home; list from scan entry → **Клиенты**.

## Paths

| Path | Change |
| --- | --- |
| `partner/roles.js` | Scanner route, `receivingScannerEligible`, `action:scan` |
| `partner/client-appeals.js` | `primeClientAppealsScan`, scan entry back / `nav:cabinet` |
| `design/general-prototype/index.html` | R2 deep links `?rc_demo_release=2&role=store&open=care|procurement` |
| `partner/roles.js` (boot) | `open=clients|care|procurement` + `role=` → cabinet + `enterCabinetPreviewDrafts`; R1 `open=care|procurement` → home + notice |

## Honest gaps (not production parity)

- **Recommendations** for receiving roles: still legacy certificate list, not a separate production module name.
- **Standalone 139–147**: embedded in cabinet via `cabinet-standalone-host.js` (see `PROTOTYPE-INTEGRATION-MATRIX.md`). Scan production flow stays `client-appeals`; page **146** is an extra design preview from Сканер.
- **Specialist** home hero still points at recommend flow, not scanner (by role copy).
- Demo writes only; observer clients toggle unchanged.
