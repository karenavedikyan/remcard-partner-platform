# ADMIN-LOGIN-RACE fix

## PR

Branch: `cursor/admin-login-race-b3e3` → base `release/prof-v1-20261007` (separate PR).  
HEAD: `0ee8d3e6827c33d5147e5b2e88dbba58b5c88482`.

## Root cause

`LoginExperience` mounted partner `AuthFlow` while `adminEnabled` was still false (`mode === "partner" || !adminEnabled`), so an existing partner session auto-redirected to `returnTo=/admin/test-users` before admin capabilities loaded. A late effect also flipped `mode` admin → partner.

## Fix (minimal)

- Admin capabilities tri-state: `pending` | `enabled` | `disabled` | `error`.
- Mount `AuthFlow` **only** when `mode === "partner"`.
- Admin intent: pending screen / password form / fail-closed block — no partner redirect side effects.
- `AuthFlow`: ignore session/readiness completion after unmount (stale redirect guard).

## Tests run

```bash
pnpm exec vitest run src/components/auth/LoginExperience.test.tsx src/components/auth/AuthFlow.test.tsx
pnpm build
node scripts/admin-login-race-browser-proof.mjs  # optional; needs platform with this commit
```

### Cases covered (vitest)

1. `initialMode=admin` + delayed capabilities → pending → admin form; **AuthFlow never mounted**.
2. Capabilities `adminPasswordLogin: false` → fail-closed UI; no AuthFlow; no router redirect.
3. Capabilities fetch error → fail-closed UI.
4. `initialMode=partner` → AuthFlow mounts.
5. Partner tab → admin tab after capabilities → AuthFlow unmounts, admin form shown.
6. AuthFlow unmount during delayed readiness → **no** `router.replace`.

## Out of scope

Production fixtures, R03 gate, merge/deploy, credentials, `prof-admin-session` guard unchanged.
