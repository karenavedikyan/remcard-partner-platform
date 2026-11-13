# P7 receiving.module.css — contract handoff (not wired in product yet)

## Selected path

- `src/components/clients/receiving/receiving.module.css` (new)

## P4 / P5 integration (required for runtime effect)

1. **P5** — side-effect import in `ClientsDirectionWorkspace.tsx`:
   `import "../receiving/receiving.module.css";`
   Activates `:global([data-testid="clients-direction-workspace"])` tab shell (prototype `ca-tabs.wallet-direction__tabs`).
2. **P4** — `ReceivingAppealsBlocked.tsx`: change import from `../observer/observer.module.css` to `./receiving.module.css` (class name stays `blocked`).

Until both land, blocked UI still uses **observer** styles; direction tabs still rely on **wallet-accruals.global.css** pill defaults only.

## Whole-section blockers (unchanged)

- **BLK-RECEIVING-APPEALS** — APIs / persistence (P2+), not CSS.
- **BLK-PERSIST** — observer personal overlay.

## Scoped checks

```bash
npx vitest run --config audit/remcard-parallel-20261113/P7/vitest.p7.config.ts src/components/clients/receiving/P7.receiving-prototype-layout.test.ts
```
