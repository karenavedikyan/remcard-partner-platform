# ACCOUNT-EXIT-01 — release report

## Scope

Account menu (prototype-aligned), profile session block, confirm dialog for global logout, signed-out screen, backend `POST /api/auth/logout-all-sessions`, prof-test-safe exit without admin session revoke.

## Backend (remcard-navigator)

- `src/lib/authSessionLogout.ts` — current vs all devices; prof test uses `exitProfTestSessionWithoutReturn`.
- `src/lib/profTestExitSession.ts` — revoke delegation, consume return slots, bump **test user** `tokenVersion` only.
- `POST /api/auth/logout` — authenticated current-device exit + cookie clear.
- `POST /api/auth/logout-all-sessions` — `tokenVersion` bump (or prof-test exit) + cookie clear.
- Allowlist: `profTestRoutePolicy` + BFF proxy.

## Frontend (remcard-partner-platform)

- `AccountSessionMenu`, `ProfileSessionActions`, `LogoutAllConfirmDialog`, `/account/signed-out`.
- Topbar account control in `AppShell` / `AgentAppShell`; removed duplicate sidebar/mobile logout buttons.

## Auth contexts

| Context | Current device | All devices |
|--------|----------------|-------------|
| PRO / Telegram / MAX | Clear cookies; no `tokenVersion` bump | Increment subject `tokenVersion`; clear cookies |
| Prof test delegation | Revoke delegation + slots; bump test user | Same (test subject only) |
| Admin password (non-test) | Same as PRO | Same as PRO |

Admin password sessions on other devices are **not** revoked when exiting a delegated test LK.

## Operator rollout

1. Merge backend PR → deploy navigator.
2. Merge frontend PR → deploy partner platform.
3. Smoke: dual-browser session A/B on disposable test user; verify `/api/auth/me` body after each step.

## Limits (NOT_VERIFIED without live stack)

- Live MAX/Telegram provider login on production.
- Full dual-session A/B on shared disposable DB in this agent run (requires running stack + test user).
