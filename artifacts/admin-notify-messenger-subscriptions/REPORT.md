# Admin notifications UI — delivery bind companion report

Branch: `feat/admin-notify-messenger-subscriptions-20261028`  
Base: `7443ac29`. **Not** status-confirm (`cc382b06`).

## Change

- Channel toggles: `disabled={!linked && !checked}` so legacy enabled-but-unbound MAX/TG can be unchecked and saved as `channels: []`.
- Copy clarifies delivery-only bind vs partner login.

## Verification (`set -o pipefail`)

| Command | Exit |
|---------|------|
| `npx vitest run src/app/admin/notifications/` | **0** |
| `npm run build` | **0** |

Backend counterpart: `remcard-navigator` same branch — see `artifacts/admin-notify-messenger-subscriptions/REPORT.md` there.
