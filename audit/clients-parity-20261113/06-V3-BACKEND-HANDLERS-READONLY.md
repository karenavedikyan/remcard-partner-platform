# V3 — read-only backend handlers (not FE helpers only)

**Backend repo:** `karenavedikyan/remcard-navigator`  
**Ref audited:** `release/prof-backend-v1-20261007` (platform docs STATUS runtime line)  
**Method:** GitHub Contents/Tree MCP (repo private; local clone via `gh` 404 without that token path).  
**No backend edits.**

## Present: owner Agent CRM (`/api/pro/agent-clients*`)

| Handler | Path | Ownership / fields / delete |
|---|---|---|
| `src/app/api/pro/agent-clients/route.ts` GET/POST | list/create | `requireOwnerClientsListContext` / `requireOwnerClientsContext`; `ownerUserId` + `deletedAt: null`; fields `displayName,phone,email,city,need,note,archivedAt`; search OR on those fields |
| `src/app/api/pro/agent-clients/[id]/route.ts` GET/PATCH/DELETE | detail/patch/delete | PATCH `action: archive\|restore` **or** field patch via `buildAgentClientPatchData`; DELETE → `softDeleteOwnedAgentClient` sets `deletedAt` (entity soft-delete), **409** if certificates or receiving-order links |
| `src/app/api/pro/agent-clients/batch/route.ts` POST | batch | `archive\|restore\|delete` on owned ids (max 100); delete uses same soft-delete guards |
| Supporting | `src/lib/agentClientPatch.ts`, `agentClientSoftDelete.ts`, `ownerClientsAccess` | Confirms actor-owned CRM semantics |

Prisma evidence: `prisma/migrations/20261015180000_prof_r03_agent_clients_certs`.

### Mapping to C-IDs

| Contract | C-IDs | Status |
|---|---|---|
| Agent CRM CRUD (owned entity) | not personal overlay | **AVAILABLE_WRONG_SEMANTICS** for C35–C38 |
| Soft-delete / archive | — | **≠** personal trash/archive buckets (C37) |

## Absent on this backend tree (exact BLOCKED)

Recursive tree of `release/prof-backend-v1-20261007` (4217 paths, not truncated):

| Claimed / needed route | Hits | Status |
|---|---|---|
| `/api/pro/referred-appeals*` | **0** | **BLOCKED** → C26/C27/C32–C34/C39–C40 |
| `/api/pro/client-appeals*` | **0** | **BLOCKED** → C07–C24 receiving CRM |
| `personal-meta` / `personalMeta` | **0** | **BLOCKED_PERSISTENCE** → C35–C38 |
| `working-stage*` | **0** | **BLOCKED** → C16 |

**Conclusion:** blockers are confirmed at **backend handler** layer, not merely missing FE helpers. Do not invent DB/rights in this audit. Agent CRM handlers must not be reused as personal referrer overlay.

## FE proxy alignment

Partner platform `remcard-proxy.ts` allowlists only `agent-clients*`, matching the handlers that exist. Referred/personal/receiving appeal routes are neither on backend tree nor on FE allowlist.
