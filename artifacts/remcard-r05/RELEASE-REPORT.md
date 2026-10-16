# RemCard R05 — Agent receivables (read-only)

## Release base (unchanged)

- Platform `release/prof-v1-20261007` @ `5266041264ed09033f03cfde88ef5c91b2757e04`
- Navigator `release/prof-backend-v1-20261007` @ `c217be012c2989085c54a1aa9e15d5824e5bfeb5`

## Branch / PR

- `cursor/r05-agent-receivables-b3e3` → draft PR into each release branch.

## Scope delivered

- Gate `PROF_R05_AGENT_RECEIVABLES_ENABLED` (default OFF) + `GET /api/pro/r05/status`.
- Read APIs: overview, partners, orders, order detail (AgentBonus-only read model).
- Agent `/settlements` → compact «Мне должны» UX when eligible; legacy hub otherwise.
- Disposable seed `r05ParityReceivablesSeed.ts` + `r05-browser-acceptance.mjs`.
- No DB migration; no payout UI; no gate enable in production.

## Blockers / gaps (honest)

- **Partial payouts** for AgentBonus not in canonical store — UI shows full paid or open only.
- **Due date / overdue / soon** filters stubbed until persisted terms exist.
- **Visual parity** vs frozen prototype: automated capture script minimal; operator visual sign-off required (`visualParityOk: false`).

## Migration

- None required.

## Status

See `TEST-RESULTS.json` for commands and `READY_FOR_REVIEW` / `BLOCKED`.
