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

## Manual verification

**Не выполнено:** реальный Comet / web.max.ru iframe на prof.remcard.ru с живым аккаунтом.

## FE tests

```bash
npx vitest run \
  src/lib/mini-app/embedded-context.test.ts \
  src/components/mini-app/MiniAppMaxEntry.test.tsx \
  src/lib/mini-app/mini-app-bootstrap-path.test.tsx \
  src/components/mini-app/MiniAppRoot.branch-switch.test.tsx \
  src/components/mini-app/MiniAppRoot.max-otp.test.tsx
```

Cross-site shell (Playwright, без prod):

```bash
MINI_APP_E2E_FE=http://127.0.0.1:3000 MINI_APP_E2E_PARENT=http://127.0.0.1:3199 node scripts/mini-app-cross-site-e2e.mjs
```