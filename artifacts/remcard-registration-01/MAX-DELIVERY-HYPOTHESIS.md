# MAX delivery — hypothesis (REGISTRATION-01.4)

**Status:** NOT_VERIFIED in production (webhook URL, secret, token — operator-only; values not logged here).

## What code fixes address

- **Identical webhook replay** for the same parsed `updateId` is deduped (no second OTP row / send).
- **Distinct** MAX events (different `update_id` / payload fingerprint) may still request a code; a **15s per-user cooldown** suppresses duplicate sends without a new `BotLoginCode` row.
- **Plain `/start`** on MAX (message, not deep link) returns the generic hint — **no OTP** (see `commands.maxLogin.test.ts`).

## Hypothesis: “dedup alone” does not explain missing replies on plain start

Dedup applies only after a webhook is **accepted and parsed**. If production showed **no bot reply at all** on a separate plain `/start` message, plausible causes include (read-only probes only):

1. Webhook not reaching this backend (DNS, path, secret mismatch → 401/404 before handler).
2. Handler error before `sendMaxMessage` / channel `send` (500; check app logs).
3. Outbound MAX API failure on hint send (distinct from dedup; second hint retry is **not** guaranteed delivery).

**Do not** treat “OTP send failed → fallback `/login` hint” as proof the user received anything — that path is best-effort (`commands.maxLoginDelivery.test.ts`).

Manual verification remains with the product owner; agents must not message owners directly.
