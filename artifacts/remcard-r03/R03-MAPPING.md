# R03 mapping (prototype → implementation)

| Prototype (roles.js / certificate-view) | Current / new | Delta |
| --- | --- | --- |
| Agent nav: certificates + clients | R01 shell + `/certificates`, `/clients` | Nav keys `certificates`, `clients` when gate ON |
| Client list/card, rename/archive/delete | `AgentClient` + `/api/pro/agent-clients` | Agent-owned records, not User.displayName |
| Certificate list, search, archive, batch | `/api/pro/agent-certificates` + workspace table | Pagination; archive ≠ CANCELLED |
| Create certificate from offers | Reuse store create via R03 POST + `issuerKindSnapshot` | Prefix `А-` on displayCode only |
| Rename certificate (workspace alias) | `CertificateUserAlias` + PATCH agent-certificates | Existing alias route unchanged |
| Share / public view | Existing `/api/certificate/[code]` + BFF | «Сертификат Ремкард» in PROF UI |
| Legacy promoCode / QR / PDF | Unchanged resolver | No mutation of promoCode string |

Gate: `PROF_R03_AGENT_CERTIFICATES_ENABLED` (default OFF).
