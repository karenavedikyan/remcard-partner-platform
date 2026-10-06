# M4-C.2: client idempotency for store order (partner scanner + BFF)

**SHA:** `f9ca38a` · **PR:** [#7](https://github.com/karenavedikyan/remcard-partner-platform/pull/7) · **base:** `cursor/m4a-launch-audit-b3e3` (`13e02fa`)

## Dependencies

| Repo | Branch / PR | Role |
| --- | --- | --- |
| **remcard-navigator** | PR [#673](https://github.com/karenavedikyan/remcard-navigator/pull/673) @ `44ab76e` | Server idempotency (required) |
| **remcard-partner-platform** | `cursor/m4a-launch-audit-b3e3` @ `13e02fa` | Scanner/history base |
| **This PR** | `cursor/m4c2-client-idempotency-b3e3` | Client + BFF header |

Deploy **backend #673 before** enabling client keys. Pre-M4-C backend: **no safe retry**.

## Client (`ScannerHub`)

Same attempt model as navigator — shared semantics:

| Event | Behavior |
| --- | --- |
| First confirm | `createStoreOrderAttempt()` — fresh key; never overwrites open attempt |
| «Проверить результат» | `prepareStoreOrderRetry()` — immutable stored key/body |
| Restored block after reload | Shown from sessionStorage even when preview fails (USED_FULLY, expired, etc.) |
| 409 | `conflict` persisted; no retry; «Новая покупка» with warning only |
| Validation 4xx (first POST) | Attempt cleared; form editable |
| Retry 4xx after unknown | Key kept |
| Amounts locked | When `unknown`, `conflict`, or `in_flight` |

## BFF (`remcard-proxy`)

| Route | Idempotency-Key |
| --- | --- |
| `POST /api/store/order` | **Required** from client; format validated; forwarded upstream |
| Other routes | Not forwarded |

Response: `Idempotent-Replayed` passed through for this route only.

## Scenarios verified (`test:proxy`)

| Scenario | Result |
| --- | --- |
| create + prepareStoreOrderRetry reuses key/body | PASS |
| 1000 → 2000 body change does not overwrite attempt | PASS |
| 409 conflict persists, blocks retry | PASS |
| First 400 vs retry 400 classification | PASS |
| Reducer: 409 → conflict, no uncertain retry | PASS |
| Reducer: validation 400 → editable form | PASS |
| BFF forwards Idempotency-Key on POST /api/store/order | PASS |

## Verification

| Check | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| `test:proxy` | 136 | 0 | 0 |
| `npm run lint` | PASS | — | — |
| `npm run build` | partial | prerender 404/500 | — |

### NOT VERIFIED

- **Full stack partner UI → BFF → navigator PG** lost-response E2E with real auth session and DB counts. Blocker: no partner login fixture + backend URL in this agent run. POST replay path verified on navigator PG integration tests (backend #673 route, not modified here).

## Rollout order

1. Navigator #673 migrate + deploy  
2. Navigator M4-C.2 (#674) + partner-platform M4-C.2 (#7) deploy together  
3. Monitor duplicate orders / 409
