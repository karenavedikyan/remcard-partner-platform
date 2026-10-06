# M4-C.2: client idempotency for store order (partner scanner + BFF)

**SHA:** _(pending push)_ · **PR:** [#7](https://github.com/karenavedikyan/remcard-partner-platform/pull/7) · **base:** `cursor/m4a-launch-audit-b3e3` (`13e02fa`)

## Dependencies

| Repo | PR / branch | Role |
| --- | --- | --- |
| **remcard-navigator** | #673 @ `44ab76e` | Server idempotency |
| **This PR** | `cursor/m4c2-client-idempotency-b3e3` | ScannerHub + BFF |

## Client (`ScannerHub`)

Same attempt model as navigator. `RemcardApiError(0)` from `remcardFetchWithMeta` → `uncertain` / `unknown_persist`, never `validation_failed`.

## Verification

| Check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| `test:proxy` | 138 | 0 | 0 |
| `test:component` (`ScannerHub.order-flow.test.tsx`) | 4 | 0 | 0 |
| `npm run lint` | PASS | — | — |
| `npm run build` (PLATFORM_INN/OGRN synthetic) | PASS | — | — |

### ScannerHub component tests (real api-client, fetch mock)

- TypeError on POST → key/body in sessionStorage, «Проверить результат», same key/body on retry
- RemcardApiError(0) → uncertain, attempt kept
- Malformed 201 + 504 → uncertain, check enabled
- First validation 400 → attempt cleared, form editable

### E2E (partner UI → BFF → navigator PG)

See navigator M4-C2 doc for full matrix. Partner desktop/mobile: Order=1, Bonus=1, usageCount=1, orderId replay confirmed.

Screenshots: `/opt/cursor/artifacts/screenshots/m4c2-partner-{desktop,mobile}.png`
