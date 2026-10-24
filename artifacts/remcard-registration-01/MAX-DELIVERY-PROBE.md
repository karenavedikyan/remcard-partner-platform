# MAX OTP delivery — production probe status

**Deployed backend SHA:** `8bfdb19343121baadfd9e22bfc12391004fba56e`  
**Deployed frontend SHA:** `0fe7da52bb02f2a515d238757c8be16ef2d83948`

## Operator observation (not root cause)

Two system lines «Вы начали общение с ботом», user text `start` ~22:04, no bot reply. Historical codes worked earlier.

## Code-level root cause (verified in repo + tests)

1. **`bot_started` dedup (10s window)** used the same `updateId` (`max:bot_started:<userId>`) for implicit open and deep-link `start=login` (`/start login`). A second «Получить код в MAX» within 10s was **silently dropped** (`handleBotCommand` returned `{}`), matching «bot opened, no code» without webhook misconfiguration.
2. **User text `start`** is supported (`shouldSendMaxLoginCodeFromUserMessage`) only if the **message webhook is delivered and parsed**. Production webhook URL/secret/token state is **NOT_VERIFIED** from this agent (no runtime credentials).

## Fix in branch `cursor/registration-01-3-b3e3` (navigator)

- Login intent (`implicit bot_started`, `/start login`, `start`, `/login`) **bypasses** the 10s dedup early-return.
- On `sendMaxMessage` failure after code creation, user receives a **plain-text fallback** hint to send `/login` (no fake success).

## Operator read-only checks (production)

1. MAX partner console → webhook URL must hit `https://<navigator-host>/api/max/webhook` (same bot id as `id230808706225_bot`).
2. Header `x-max-bot-api-secret` must match `MAX_WEBHOOK_SECRET` on server (401 on mismatch — events dropped).
3. `MAX_BOT_TOKEN` must be set for outbound `botapi.max.ru/messages` (otherwise `no_token` — code row created but not delivered).
4. After deploy, repeat: open deep link → expect code within one message; within 10s tap again → code must still arrive.

Do **not** paste tokens, OTP codes, or chat contents into tickets.

## Regression coverage (disposable DB)

`commands.idempotency.test.ts`, `max.parseWebhook.test.ts`, existing MAX webhook route tests — run via `pnpm exec vitest run src/lib/bots`.
