# M4-C.2: client idempotency for store order (partner scanner + BFF)

## Dependencies

| Repo | Branch / PR | Role |
| --- | --- | --- |
| **remcard-navigator** | PR [#673](https://github.com/karenavedikyan/remcard-navigator/pull/673) `cursor/m4c-order-idempotency` @ `44ab76e` | Server idempotency (required) |
| **remcard-partner-platform** | `cursor/m4a-launch-audit-b3e3` @ `13e02fa` | Scanner/history base |
| **This PR** | `cursor/m4c2-client-idempotency-b3e3` | Client + BFF header |

Deploy **backend #673 before** enabling client keys. Pre-M4-C backend: **no safe retry**.

## Client (`ScannerHub`)

Same attempt model as navigator — see navigator `M4-C2` doc. Key points:

- UUID + body snapshot in `sessionStorage` before POST
- «Проверить результат» on uncertain outcome (same key/body)
- Amounts locked when uncertain; «Новая покупка» clears attempt
- `userId` prop binds attempt to authenticated user

## BFF (`remcard-proxy`)

| Route | Idempotency-Key |
| --- | --- |
| `POST /api/store/order` | **Required** from client; format validated; forwarded upstream |
| Other routes | Not forwarded (no generic header passthrough) |

Response: `Idempotent-Replayed` passed through for this route only. No automatic POST retry in proxy. Origin/cookie/Basic Auth unchanged.

## Verification

| Check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| `test:proxy` (incl. attempt + BFF key) | 128 | 0 | 0 |
| `pnpm lint` | PASS | — | — |
| `pnpm build` | PASS | — | — |

### NOT VERIFIED

- Full stack **partner UI → BFF → navigator PG** lost-response E2E (requires both apps + auth session against live backend). Covered separately: BFF stub tests + navigator PG client integration on backend branch #673.

## Rollout order

1. Navigator #673 migrate + deploy  
2. Navigator M4-C.2 + partner-platform M4-C.2 deploy together  
3. Monitor duplicate orders / 409
