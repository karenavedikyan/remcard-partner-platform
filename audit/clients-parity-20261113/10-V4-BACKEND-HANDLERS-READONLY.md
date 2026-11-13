# V4-QA — backend handlers (read-only)

**No DB / rights / finance / prod changes.** Tree inspection only via GitHub API on `karenavedikyan/remcard-navigator`.

## Refs checked

| Label | Ref | Tree note |
|---|---|---|
| **Primary BE (STATUS.md / V3 pin)** | `release/prof-backend-v1-20261007` | 4217 paths, not truncated |
| STATUS runtime SHA | `94636ab4ecc4ea377b5a543aac85c6c8ea5011f3` | documented in `docs/STATUS.md`; not re-deployed |
| Computer staging tip | `computer/remcard-timeweb-staging` @ `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | 2078 paths; **no** `agent-clients` / referred / client-appeals / personal-meta |
| Phrase “current b38” | **unresolved** as a navigator SHA/branch | Treated as re-verify **current BE** = release pin above (+ staging tip contrast). No commit `b38…` resolved. |

## Handler presence (`release/prof-backend-v1-20261007`)

| Surface | Hits | Paths (examples) | Semantics vs Clients parity |
|---|---|---|---|
| `/api/pro/agent-clients*` | **6** | `route.ts`, `[id]/route.ts`, `batch/route.ts` | **Owned Agent CRM** (displayName/note/archive/delete). ≠ referrer personal overlay. |
| `/api/pro/referred-appeals*` | **0** | — | **ABSENT** → observer referred list/detail contracts **BLOCKED** |
| `/api/pro/client-appeals*` | **0** | — | **ABSENT** → receiving CRM **BLOCKED** |
| `personal-meta` / `personalMeta` | **0** | — | **ABSENT** → referrer alias/tag/note persistence **BLOCKED_PERSISTENCE** |
| `working-stage*` | **0** | — | **ABSENT** → stage CRUD **BLOCKED** |

### agent-clients sample (GET/POST)

`src/app/api/pro/agent-clients/route.ts` on release: owner-scoped list/create of `prisma.agentClient` with `displayName`, `note`, `archivedAt`, soft-delete via `deletedAt`. Batch archive/restore/delete exist on sibling routes. **Wrong subject** for “personal meta on a referred appeal.”

## Staging tip (`e6696a44`)

No matching API paths in tree. Do **not** claim staging tip proves agent-clients availability; use release pin for handler inventory. Computer UI verification of FE handlers remains separate from this BE tree.

## Mapping to C-matrix

| Blocker | Requirements |
|---|---|
| BLK-RECEIVING-APPEALS | C07–C24 |
| BLK-OBSERVER-REFERRED | C27, C32, C34, C39–C40 |
| BLK-OBSERVER-PERSONAL-PERSIST | C35–C38 (**UI form + disabled save ≠ persistence PASS**) |
