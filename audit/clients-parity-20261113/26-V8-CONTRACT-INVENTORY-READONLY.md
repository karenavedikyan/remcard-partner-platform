# V8 — read-only contract inventory

**Method:** GitHub tree/file read on `karenavedikyan/remcard-navigator` @ `release/prof-backend-v1-20261007` + FE source on author tip `a36c609b`.  
**No** API calls with real accounts/data. **No** mutations.

## Backend (`release/prof-backend-v1-20261007`, 4217 paths)

| Pattern | Hits | Paths |
|---|---|---|
| `client-appeals` | **0** | — |
| `referred-appeals` | **0** | — |
| `personal-meta` / `personalMeta` | **0** | — |
| `working-stage` | **0** | — |
| `agent-clients` | **6** | `src/app/api/pro/agent-clients/route.ts`, `[id]/route.ts`, `batch/route.ts` (+ dirs) |
| `receiving-client` | **2** | `src/app/api/store/orders/[orderId]/receiving-client/route.ts` (+ dir) |

### agent-clients semantics (sample)

`GET/POST src/app/api/pro/agent-clients/route.ts`: `prisma.agentClient` with `ownerUserId`, fields `displayName`, `phone`, `email`, `city`, `need`, `note`, `archivedAt`.  
**Owned Agent CRM** — not referrer personal overlay on a referred appeal.

### receiving-client semantics

Order-scoped link/unlink of `agentClientId` — **not** appeals CRM / stages / funnel.

## Frontend (tip `a36c609b`)

| Surface | Path | Role |
|---|---|---|
| Receiving blocked shell | `src/components/clients/direction/ReceivingAppealsBlocked.tsx` | UI present; lists missing APIs |
| Direction workspace | `src/components/clients/direction/ClientsDirectionWorkspace.tsx` | incoming → blocked shell; outgoing → observer |
| Observer fetch adapter | `src/lib/clients-parity/fetch-observer-appeals.ts` | always `ok:false` / `BLOCKED_CONTRACT` |
| Contract registry | `src/lib/clients-parity/contracts.ts` | BLK-RECEIVING / REFERRED / PERSONAL-PERSIST |
| Personal save | `ObserverPersonalEditPanel.tsx` | `disabled` + `title="BLOCKED_PERSISTENCE"` |
| FE proxy allowlist | `src/lib/remcard-proxy.ts` | agent-clients* + store receiving-client only |

## Distinction rule used in C-matrix

| gapKind | Meaning |
|---|---|
| `MISSING_SERVER` | Required handler path absent on BE tree (0 hits) and/or not on FE proxy; UI may still show a blocked shell or fixture |
| `WRONG_SEMANTICS` | Handler exists but wrong subject (e.g. agent-clients delete ≠ personal trash) |
| `PACKAGING_FORBIDDEN` | Tip diverges from `57ca4680` on Gate/Context/route/helper/vitest |
| `VISUAL_ETALON_INCOMPLETE` | UI present; full prototype pixel/overlay not claimed |
| `NOT_EXERCISED` | Not proven this pass |
| `SCOPE_EXCLUDED` | C05 / C56 |

**Missing UI ≠ missing server:** receiving CRM uses an explicit blocked UI shell; observer list/detail UIs exist on fixtures while server referred-appeals remains ABSENT.
