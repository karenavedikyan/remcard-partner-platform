# П1 — early contract / proxy handoff (no wire yet)

## Status

| Item | Value |
|------|--------|
| Section publishable | **false** |
| `remcard-proxy.ts` wire | **K1/K2/K5** source routes whitelisted — see `PROXY-CLIENTS-ROUTE-MANIFEST.md` |
| Receiving identity | **Canonical correction** → `RECEIVING-PRINCIPAL-CANONICAL.md` + `canonical-receiving-principal.json` |
| DB migrate/deploy | **separate user confirmation** — not this agent |
| P2 matrix | `ac2d4a7b` → `audit/.../P2/contract-operation-matrix-8137.md` |

## Prototype source (frozen `3dc31836`)

| File | Domain |
|------|--------|
| `design/general-prototype/partner/client-appeals.js` | appeals, receiving, stages, purchases |
| `design/general-prototype/partner/observer-personal-list.js` | `meta[id].{alias,tag,note,bucket,beforeTrash}`, bulk ops |

Agent scope: **only** observer «Мои клиенты у партнёров» — no receiving CRM, no vacancies/levels.

## P2 matrix conclusion (8137)

Under **no-schema / no-new-rights** restrictions: **no complete path** from current navigator routes to prototype `Appeal` + personal overlay. Existing `agent-clients` / `agent-certificates` are **Incompat** — must not proxy as fake referred appeals.

## Canonical routes (proposal only — **not** in `ALLOWED_ROUTES`)

Navigator/backend owners (**K8/K1/K2/K5**) must define handlers, auth, row ownership, response JSON **before** P1 adds proxy lines.

### Observer referred (read-first)

| Method | Path | Prototype ref |
|--------|------|----------------|
| GET | `/api/pro/referred-appeals` | `ownReferredAppeals()` grouping |
| GET | `/api/pro/referred-appeals/:id` | appeal card + `history[]` |
| GET | `/api/pro/referred-appeals/by-partner/:partnerId` | partner drill |

### Observer personal overlay (after read exists)

| Method | Path | Prototype ref |
|--------|------|----------------|
| PATCH | `/api/pro/referred-appeals/:id/personal-meta` | `observerPersonalMeta` |
| POST | `/api/pro/referred-appeals/personal-batch` | bulk tag/archive/trash |

### Out of agent scope (do not proxy for observer package)

`client-appeals*`, `working-stages`, receiving CRM writes — prototype `client-appeals.js` receiving branch; **BLK-RECEIVING-APPEALS**.

## P1 proxy owner rules (when contract is signed)

1. Add **only** exact method+`RegExp` pairs to `ALLOWED_ROUTES` in `src/lib/remcard-proxy.ts`.
2. **No** host/env/auth-header/gate changes; preserve `applyUpstreamAuthHeaders`.
3. **No** wildcards; **no** substitute paths to `agent-clients` for referred ids.
4. Partner `fetch-observer-appeals.ts` wires only after `200` contract tests + mocked integration.

## Forbidden substitutes (matrix P4–P10)

- `PATCH /api/pro/agent-clients/:id` for personal alias/note  
- `POST /api/pro/agent-clients/batch` for observer trash  
- `PATCH /api/certificate/:code/alias` for appeal meta  
- Demo fixtures / localStorage in product  

## Smallest next actions

| Owner | Action |
|-------|--------|
| **K/navigator** | Ship canonical OpenAPI or route spec for referred-appeals + personal-meta + DB plan |
| **P2** | Update matrix when routes exist; drop `BLOCKED_CONTRACT` ids |
| **P1** | After canonical spec: add proxy allowlist + scoped `remcard-proxy` test (one route smoke) |
| **Root** | Selected-file UI assembly + **separate** DB approval + publish |

## Integration command (read-only today)

```bash
git show ac2d4a7b:audit/remcard-parallel-20261113/P2/contract-operation-matrix-8137.md | head -40
rg 'referred-appeals' src/lib/remcard-proxy.ts  # K5 personal-meta + personal-batch only; NOT client-appeals/personal-overlay
```
