# RemCard PROF — приёмка мини-кабинета «Кошелёк»

База релиза:

| Репозиторий | SHA |
|-------------|-----|
| FE `remcard-partner-platform` | `1ef028e9706cf9ad2c756f07587dadc4be2c1933` |
| BE `remcard-navigator` | `fbaa35f7b646e3b82c630af0753725e8cb379e59` |

Ветка FE: `cursor/remcard-mini-app-wallet-20261123` (от `release/clients-qa-fixes-20261121`).

## Объём

- Полноэкранный кошелёк мини-кабинета (`MiniAppWallet`), карточка на главной без изменения оболочки.
- Read-only `GET /api/pro/mini-app/wallet/settlements` через BFF allowlist + mini-app session cookie.
- BE diff: `artifacts/remcard-mini-app-wallet-20261123/be.patch` (репозиторий navigator недоступен на запись — binary patch + SHA-256).
- Без мутаций, выплат, PR и deploy. Синтетические данные в fixture-mode.

## Команды проверки

```bash
cd remcard-partner-platform
git checkout cursor/remcard-mini-app-wallet-20261123
npm run test -- src/lib/mini-app/wallet/calc.test.ts src/lib/mini-app/wallet/sanitize.test.ts
npx vitest run src/components/mini-app/MiniAppWallet.test.tsx
npm run test -- src/lib/remcard-proxy.test.ts
```

Dev UI (375px, светлая/тёмная тема через `prefers-color-scheme`):

```bash
npm run dev
# /dev/mini-app-flow?fixture=agent-telegram&screen=wallet
# /dev/mini-app-flow?fixture=store-max&screen=wallet
```

## Роли

| Роль | Входящие | Исходящие | Филиал |
|------|----------|-----------|--------|
| agent | да | скрыто | bootstrap branch |
| specialist | да | да | — |
| store | да | да | activeBranchId |
| company | да | да | activeBranchId |

## BFF

- `isAllowedProxyRoute('GET', '/api/pro/mini-app/wallet/settlements')` → true
- Cookie `remcard-mini-app-session` проксируется на wallet route
- Legacy `GET /api/pro/wallet/settlements` не ослаблен