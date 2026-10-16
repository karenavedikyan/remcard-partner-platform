# WALLET-PHONE-01

Separate from ACCOUNT-EXIT-01 (draft PRs [#687](https://github.com/karenavedikyan/remcard-navigator/pull/687) / [#24](https://github.com/karenavedikyan/remcard-partner-platform/pull/24)).

## 1. Wallet view modes (R05)

- CSS cascade fixes in `agent-receivables.module.css`: `minmax(0,1fr)`, `min-width:0` on grid children, list/medium/large density, sums with `tabular-nums` + `overflow-wrap` (no silent clip).
- Unknown `localStorage` view falls back to `list`.
- View/filter/page state unchanged when switching density.

## 2. Excel (.xlsx)

- Backend `POST /api/pro/wallet/agent-receivables/export?exportKind=overview|partners|orders&…filters`.
- Full filtered dataset (not UI page); max 8000 rows → HTTP 413.
- Sheets: Описание, Партнёры, Заказы, Категории, История (real payment rows only when present).
- BFF allowlist + prof-test allowlist entry.
- Frontend button «Excel (.xlsx)» on overview/partners/orders.

## 3. Profile phone

- `contact-phone-display.ts`: canonical `+7XXXXXXXXXX`, typing via `sanitizePhoneTyping`, display on blur.
- `AgentPhoneField` in agent profile wizard (no double format on every keystroke).

## Prototype

- `artifacts/remcard-wallet-phone/prototype-fixes.patch` — layout grid min-width, list row typography, phone overflow guard (author Perplexity app; not frozen ZIP).

## NOT_VERIFIED here

- Live 1440/375/320 PNG matrix on disposable stack with seeded R05 data.
- Dual-session / production smoke.
