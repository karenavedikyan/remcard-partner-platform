# RemCard mini cabinet pilot — acceptance notes

Branches (no PR, pilot off by default):

| Repo | Branch | Base SHA (start) |
|------|--------|------------------|
| remcard-partner-platform | `cursor/remcard-mini-app-telegram-and-max-6d4e` | `cef882f3181b1905904dcb5c4b5ffbec69cb8351` |
| remcard-navigator | `cursor/remcard-mini-app-telegram-and-max-6d4e` | `84cace7cec8865fdb807f60c1660567bb2c77edd` |

## Prototype alignment (user-provided screenshots)

| Screen | Prototype reference | Implementation | Notes |
|--------|---------------------|----------------|-------|
| Agent home | Image 1 | `/mini-app` + dev fixture `agent-*` | Horizontal role plaque top-left; primary full-width «Создать сертификат»; list rows for invite + full cabinet; no DEMO badge |
| Specialist home | Image 2 | `specialist-*` | Dual quick-action tiles; create primary / scan secondary |
| Store home | Image 3 | `store-*` | Scan primary; pin line under card; create secondary |
| Company home | Image 4 | `company-*` | Branch button under card; dual quick actions |
| New certificate | Collage TL | `screen=create` | Uses live `CertificateCreateForm` (real programs/clients from API) |
| Certificate ready | Collage TR | `certificate-ready` | Real QR (`qrcode`) + promo code; button «Скопировать код» |
| Invite partner | Collage BL | `screen=invite` | Copies existing link-invite URL; no auto-send |
| Full cabinet | Collage BR | `screen=full-cabinet` | Transition copy + link to `/partners` |

Telegram and MAX share the same React UI (`/mini-app`); only host `initData` exchange differs.

## Tests run (this VM)

- `remcard-navigator`: `vitest` — `messengerWebAppInitData.test.ts`, `miniAppBootstrap.actions.test.ts` — pass
- `remcard-partner-platform`: `npm run build` — pass (after fixture type fix)
- `npm run test:proxy` — 2 pre-existing failures (`order-totals`, `store-order-attempt`)

## Real devices vs local

| Area | Local stand | Real Telegram / MAX |
|------|-------------|---------------------|
| UI fixtures 375×812 | `scripts/mini-app-visual-capture.mjs` + `/dev/mini-app-fixture` | Not run on physical devices in this session |
| initData session | Unit-tested HMAC | Needs bot + linked account |
| Certificate issue / scan | Proxied APIs when backend up | Same |

## Config for pilot (no secret values)

- `PROF_MINI_APP_ENABLED=1` (navigator)
- `TELEGRAM_BOT_TOKEN`, `MAX_BOT_TOKEN` (navigator — WebApp validation only; not logged)
- `REMCARD_API_BASE_URL` (partner platform BFF)
- `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_PROF_APP_URL`
- Existing prof cabinet + partnership routes (unchanged)

Pilot remains disabled until ops sets `PROF_MINI_APP_ENABLED`.