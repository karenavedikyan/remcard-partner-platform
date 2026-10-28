# Admin notifications UI — delivery bind (frontend companion)

Base frontend: `7443ac29`. Branch: `feat/admin-notify-messenger-subscriptions-20261028`.

## UI flow

- Settings section explains **delivery confirmation** is separate from partner/client messenger login.
- Channel checkboxes disabled until `bindings.telegramLinked` / `maxLinked` from admin bind status API.
- «Привязать Telegram/MAX» → `startAdminNotificationBind` → trusted deep link (`nbind_admin_*` payload from backend).
- Save blocked client-side if channel enabled without bind; server also validates on PATCH.

## Not in this repo

- Delivery endpoint storage and bot completion (remcard-navigator).
