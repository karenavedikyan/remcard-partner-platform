# RemCard mini cabinet pilot — acceptance notes

Branches (closed pilot, **no PR / merge / deploy**):

| Repo | Branch |
|------|--------|
| remcard-partner-platform | `cursor/remcard-mini-app-telegram-and-max-6d4e` |
| remcard-navigator | `cursor/remcard-mini-app-telegram-and-max-6d4e` |

Baseline (previous push): partner `3ffb52ad`, navigator `0a99c0c9`.

## Task status (this iteration)

| # | Task | Status |
|---|------|--------|
| 1 | `miniAppReadOnlyCertificateScan` fail-closed per cert/branch/role before any client fields; agent forbidden | **Done** — reordered auth; vitest (6 cases, mocks, no DB writes) |
| 2 | Short «Новый сертификат» + ready screen with QR/copy via `POST /api/pro/mini-app/certificate` + `Idempotency-Key` | **Done live path** — loads `available-partners` + `agent-clients`; store/company need branch, no invented values. **Not E2E** against staging DB |
| 3 | Wallet UI + captures | **Done** — `remcard.` top-right; circular `→` bottom-right; agent row CTA `→`. 8 home + 4 flows (`create`, `certificate-ready`, `invite`, `full-cabinet`); Next dev badge hidden in capture CSS |

### Synthetic / fixture disclaimer

- `/dev/mini-app-fixture` and `/dev/mini-app-flow` use `data-mini-app-synthetic-fixture`.
- `create` flow screenshot uses `MINI_APP_FIXTURE_CREATE_SEED` (static program/client) — **not** proof of live API create.
- `certificate-ready` uses `MINI_APP_FIXTURE_CREATED_CERTIFICATE` + real QR generation from fixture URL.

## Visual QA (375×812)

```bash
cd remcard-partner-platform
npm run dev -- --port 3000
MINI_APP_CAPTURE_BASE=http://127.0.0.1:3000 node scripts/mini-app-visual-capture.mjs
```

Outputs: `artifacts/mini-app-pilot-20261122/screenshots/*`

## Tests (this iteration)

| Repo | Command | Result |
|------|---------|--------|
| navigator | `vitest run src/lib/__tests__/miniAppCertificateScan.test.ts` | 6 pass |
| navigator | `pnpm run build` (NODE_OPTIONS=--max-old-space-size=8192) | pass |
| partner-platform | `npm run build` | pass |
| partner-platform | `vitest run src/lib/mini-app/*.test.ts` | 5 pass |
| partner-platform | `npm run test:proxy` | 312 pass, **2 legacy fail** (`order-totals`, `store-order-attempt`) |

## Blockers / not verified

- Telegram / MAX WebApp `initData`, pilot allowlist users, live scan/create on staging DB
- Store/company create without agent client list — relies on server `available-partners` only (no separate client picker unless business rules add one)
- Pixel parity with user reference images IMG_7117/7118 (manual review of captures only)

## Config (no secrets)

- Navigator: `PROF_MINI_APP_ENABLED`, `PROF_MINI_APP_PILOT_USER_IDS`, bot tokens, `JWT_SECRET`
- Partner: `REMCARD_API_BASE_URL`, `NEXT_PUBLIC_PROF_APP_URL`