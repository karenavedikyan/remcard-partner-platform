# RemCard PROF — MAX mini-cabinet login recovery

| Repo | Branch | Base |
|------|--------|------|
| FE `remcard-partner-platform` | `cursor/remcard-max-login-recovery-20261123` | `5fbd18402f2b90b297d3f794fec3dc7ce99971be` |
| BE `remcard-navigator` | patch only (no clone write access from agent VM) | `fec124d463fa024a24b98e8229c7ae02b52add49` |

## BE patch

```bash
cd remcard-navigator
git checkout -b cursor/remcard-max-login-recovery-20261123 fec124d463fa024a24b98e8229c7ae02b52add49
git apply /path/to/be.patch
```

SHA-256: see `checksums.txt`.

### Patch scope (product only)

Touched paths under `remcard-navigator` (no DB migrations, no prod flags, no bot command edits):

- `src/app/api/pro/mini-app/session/route.ts` — `POST` only (no helper re-exports)
- `src/app/api/pro/mini-app/auth/send-code/route.ts`
- `src/app/api/pro/mini-app/auth/verify-code/route.ts`
- `src/app/api/pro/mini-app/bootstrap/route.ts`
- `src/app/api/pro/mini-app/scan/route.ts`
- `src/app/api/pro/mini-app/certificate/options/route.ts`
- `src/app/api/pro/mini-app/__tests__/auth.routes.test.ts`
- `src/lib/miniAppSessionCookie.ts`, `miniAppEmbeddedAuth.ts`, `miniAppCabinetAuth.ts`
- `src/lib/bots/miniAppLoginDispatch.ts`
- `src/lib/miniAppMessengerOtpVerify.ts`
- `src/lib/__tests__/miniAppEmbeddedAuth.test.ts`, `miniAppCabinetAuth.test.ts`, `miniAppMessengerOtpVerify.test.ts`

## Manual verification

**Не выполнено:** реальный Comet / web.max.ru iframe на prof.remcard.ru с живым аккаунтом.

## FE tests

```bash
npx vitest run \
  src/lib/mini-app/embedded-context.test.ts \
  src/components/mini-app/MiniAppMaxEntry.test.tsx \
  src/lib/mini-app/mini-app-bootstrap-path.test.tsx \
  src/components/mini-app/MiniAppRoot.branch-switch.test.tsx \
  src/components/mini-app/MiniAppRoot.max-otp.test.tsx \
  src/components/mini-app/MiniAppRoot.max-recovery.test.tsx \
  src/components/mini-app/MiniAppRoot.max-unlinked.test.tsx \
  src/lib/mini-app/parse-auth-errors.test.ts
```

Cross-site shell (Playwright, без prod):

```bash
MINI_APP_E2E_FE=http://127.0.0.1:3000 MINI_APP_E2E_PARENT=http://127.0.0.1:3199 node scripts/mini-app-cross-site-e2e.mjs
```