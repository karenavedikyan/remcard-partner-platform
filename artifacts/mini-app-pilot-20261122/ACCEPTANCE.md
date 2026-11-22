# RemCard mini cabinet pilot — acceptance notes

Branches (no PR, pilot off by default):

| Repo | Branch |
|------|--------|
| remcard-partner-platform | `cursor/remcard-mini-app-telegram-and-max-6d4e` |
| remcard-navigator | `cursor/remcard-mini-app-telegram-and-max-6d4e` |

## Closed pilot access

- `PROF_MINI_APP_ENABLED=1` **alone is not enough**
- Required: `PROF_MINI_APP_PILOT_USER_IDS` — comma-separated internal `userId` and/or `publicId` values
- Without a non-empty allowlist, mini-app routes return **404** even when the flag is on

## Visual QA (375×812, this VM)

Command:

```bash
cd remcard-partner-platform
npm run dev -- --port 3000
MINI_APP_CAPTURE_BASE=http://127.0.0.1:3000 node scripts/mini-app-visual-capture.mjs
```

- 8 home fixtures: `artifacts/mini-app-pilot-20261122/screenshots/*-home.png`
- 4 flow screens (specialist): `flow-specialist-telegram-{create,scan,invite,full-cabinet}.png`
- Wallet card metrics on capture: **286×176 px** (all 8 fixtures; target ~176.5)
- Synthetic markup only on `/dev/mini-app-fixture` and `/dev/mini-app-flow`, not on `/mini-app`

## Tests run (this iteration)

| Repo | Command | Result |
|------|---------|--------|
| navigator | `vitest` messengerWebAppInitData, miniAppSessionCookie, profMiniAppConfig, miniAppBootstrap.actions | pass |
| partner-platform | `npm run build` | pass |
| partner-platform | `vitest` host.test, mini-app-bootstrap-path.test | pass |

## Still not verified on real Telegram / MAX

- Physical WebApp `initData`, consent-linked accounts, live QR scan/create against staging DB
- Prototype pixel-diff against user reference images (manual eyeball on capture only)

## Config (no secrets)

- Navigator: `PROF_MINI_APP_ENABLED`, `PROF_MINI_APP_PILOT_USER_IDS`, `TELEGRAM_BOT_TOKEN`, `MAX_BOT_TOKEN`, `JWT_SECRET`
- Partner: `REMCARD_API_BASE_URL`, `NEXT_PUBLIC_PROF_APP_URL`