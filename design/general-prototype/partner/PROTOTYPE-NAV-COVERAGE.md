# Partner prototype · navigation coverage (R1 default)

Legend: **Live** = wired module in cabinet (`roles.js` shell). **Legacy** = `legacyLa()` fragments. **R2** = only when «Релиз → R2» in review toolbar (`rc_release` / `?rc_demo_release=2`).

| Section | Specialist | Store | Company | Agent | Employee |
| --- | --- | --- | --- | --- | --- |
| Home | Live | Live | Live | Live | Live (rights-based teasers; no R2 teasers in R1) |
| Clients | Live (`client-appeals.js`) | Live | Live | Live (sender-only) | Live if `clients` permission |
| Partners | Live (`partners-redesign.js`) | Live | Live | Live | Live if terms/scan/sale |
| Recommendations | Live | Live | Live | Live | Live if `clients` |
| Scanner | Legacy stub in `legacyLa` | Live route | Live | — | Live if scan/sale |
| Wallet / bonus / settlements | Live (`wallet-accruals.js`) | Live | Live | Live (`bonus`) | Live if ledger rights |
| Purchases / operation details | Via clients module | Via clients | Via clients | Via clients | Via clients |
| Profile | Live (`profile-wizard.js`) | Live | Live | Live | Live |
| Certificates | Live (agent home / cert flows) | — | — | Live | — |
| Team / links | links → partners or profile | links | links | — | team in profile if `team` |
| Закупки | R2 only (`procurement.js`) | R2 only | R2 only | R2 only | R2 if terms/catalog perm |
| Забота RemCard | R2 only (`care-services.js`) | R2 only | R2 only | R2 only | R2 if terms/catalog/sale |

## Paths touched this pass

- `design/general-prototype/partner/roles.js` — release helpers, `Te()` filter, home teasers, nav guard, toolbar «Релиз», agent nav links
- `design/general-prototype/partner/roles.html`, `partner/index.html` — cache bump `roles.js?v=nav-r1-20261112`
- `design/general-prototype/preview-memory.js` — unchanged (already seeds `rc_release` from query)

## Known gaps (not claimed 100% parity)

- **Scanner** for specialist still partly legacy shell content vs production scanner.
- **Employee** without full rights sees reduced nav; empty states from `empty-states.js`, not every production edge case.
- **Production** financial write paths remain demo-only (no fake success).
