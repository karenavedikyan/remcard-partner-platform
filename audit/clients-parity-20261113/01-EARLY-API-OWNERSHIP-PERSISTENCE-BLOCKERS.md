# EARLY API / ownership / persistence blocker report

**Status date:** 2026-11-13  
**Auditor branch/HEAD:** `cursor/remcard-wallet-dialog-width-20261103` @ `4f64b8cf`  
**Prototype:** `3dc31836cd18d9209c20097f18b906dd276f7af6`  
**Production FE base audited:** `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` (proxy + FE clients)  
**Scope:** read-only. No product edits. No DB/permission invention.

---

## Verdict (C38 / personal referrer overlays)

**Existing personal per-referrer alias / tag / note / archive / trash contracts do NOT exist on production FE `57ca4680` in a form that can implement the prototype’s “Мои клиенты у партнёров” personal organisation without backend/DB/permission changes.**

Do **not** assume global agent client CRUD (`/api/pro/agent-clients*`) has that meaning.

| Prototype capability (observer personal list) | Existing production contract? | Safe to reuse without DB/rights? | Blocker |
|---|---|---|---|
| Personal **alias** overlay on a **referral/appeal row** (partner’s client name unchanged) | **No.** `AgentClientRow.displayName` is the owned CRM name; certificate `userAlias` is cert-title-for-self, not referral overlay | **No** — PATCH displayName mutates owned client entity | **BLOCKED_PERSISTENCE** (C35, C38) |
| Personal **tag** | **No field** on `AgentClientRow` / detail / proxy | **No** | **BLOCKED_PERSISTENCE** (C35–C36, C38) |
| Personal **note** overlay (private to referrer; receiving partner notes hidden) | Only `AgentClientRow.note` on owned agent client; no referrer-overlay note API | **No** — wrong subject/ownership | **BLOCKED_PERSISTENCE** (C35, C38, C40) |
| Personal **active / archive / trash** buckets that do **not** change partner data | Agent clients: `archivedAt` + batch `archive\|restore\|delete` on **owned** `/api/pro/agent-clients`; **no trash bucket**, delete is entity delete | **No** — `deleteAgentClient` / batch delete ≠ “Удалить только из своего списка” | **BLOCKED** (C37) — semantic mismatch |
| Persist personal meta across reload | Prototype: in-memory demo (“до обновления страницы”). Spec forbids localStorage/sessionStorage as production store | **No** confirmed user contract for referral personal meta | **BLOCKED_PERSISTENCE** (C38) |

Prototype source proof (`observer-personal-list.js`):  
`workspace.observerPersonal.meta[id] = { alias, tag, note, bucket, beforeTrash }` — “Personal organisation of demo referrals. Never mutates partner appeals or ledger.” / “Демо: изменения до обновления страницы.”

---

## Inventory of available client-related contracts on `57ca4680`

### A. Agent-owned CRM (`src/lib/agent-r03/api.ts` + proxy allowlist)

| Method | Path | FE helper | Subject | Fields / actions | Role gate (FE) |
|---|---|---|---|---|---|
| GET | `/api/pro/agent-clients` | `fetchAgentClients` | Actor’s agent clients | list + `archived` query | R03 eligible / clients section |
| POST | `/api/pro/agent-clients` | `createAgentClient` | New owned client | `displayName`, phone, email, city, need, note | same |
| GET | `/api/pro/agent-clients/:id` | `fetchAgentClient` | Owned client detail | client + certificates + purchase scopes | same |
| PATCH | `/api/pro/agent-clients/:id` | `patchAgentClient` | Owned client | displayName/need/city/contacts/note **or** `action: archive\|restore` | same |
| DELETE | `/api/pro/agent-clients/:id` | `deleteAgentClient` | Owned client | hard/soft delete per backend | same |
| POST | `/api/pro/agent-clients/batch` | `batchAgentClients` | Owned clients | `archive\|restore\|delete` + ids | same |

**Ownership:** entity owned by the agent (or business clients shell reusing R03). **Not** a personal overlay on another partner’s receiving appeal.

**Idempotency:** batch/delete not proven idempotent for “trash+undo” semantics of the prototype.

### B. Certificate personal alias (related but wrong entity)

| Method | Path | Field | Meaning |
|---|---|---|---|
| PATCH | `/api/pro/agent-certificates/:id` | `userAlias` | “Название для себя” on **certificate**, not referral client row |

Cannot satisfy C32–C36 personal client alias/tag/note.

### C. Receiving-client link on store order

| Method | Path | Helper | Meaning |
|---|---|---|---|
| PATCH | `/api/store/orders/:id/receiving-client` | `patchStoreOrderReceivingClient` | link/unlink `agentClientId` to an order |

Does not provide appeals CRM, stages, personal overlays, or partner-grouped observer lists.

### D. Business clients gate (FE only)

`resolveBusinessOwnerClientsEligibility` — workplace STORE/COMPANY org member eligibility. **Read-only for this audit.** Does not add referral personal storage.

### E. Missing on FE proxy / FE libs (relative to prototype receiving CRM)

No allowlisted FE routes found for:

- appeals / leads / referrals list-detail
- working stages / refusal reasons CRUD
- funnel analytics for receiving CRM
- observer personal meta CRUD
- soft “personal trash” independent of entity delete

Prototype receiving CRM (`client-appeals.js`: stages, scan, manual, purchase, funnel, bulk stage edit) therefore cannot be claimed PASS against existing contracts without new backend — mark **BLOCKED** per C16/C18/C07–C17 where no contract exists.

---

## Requirement-level early blockers (subset)

| ID | Status | Why |
|---|---|---|
| **C35** | **BLOCKED_PERSISTENCE** | No API for referrer-only alias/tag/note without mutating owned client or inventing storage |
| **C36** | **BLOCKED_PERSISTENCE** | Mass tag-only edit has no endpoint; cannot PATCH tag field |
| **C37** | **BLOCKED** | `deleteAgentClient` / batch delete ≠ personal trash; would affect owned CRM entity, not “только из своего списка” |
| **C38** | **BLOCKED_PERSISTENCE** | Prototype meta is demo in-memory; no production user contract; localStorage forbidden as substitute |
| **C16** | **BLOCKED** (pending deeper map) | Working stages/refusal CRUD — no FE API surface on base |
| **C18** | **BLOCKED** (pending deeper map) | Funnel metrics — demo `renderFunnelPage` arithmetic must not be copied; no matching FE analytics contract found |
| **C02/C05** | **EXCLUDED** path for agent receiving CRM pages 107–112 | Must remain unavailable; verify server denial when candidate exists |
| **C56** | Constraint | Cannot unblock by inventing API, DB, rights, or feature flags |

**Non-blocked opportunity (UI-only / composition):** direction tabs, empty states, layout chrome, navigation composition within existing agent-clients / business clients shells **where data is already owned CRM**, without claiming personal-overlay persistence PASS.

---

## Explicit anti-pattern (do not do)

1. Map prototype personal alias → `patchAgentClient({ displayName })` on a referral row.  
2. Map “Удалить у себя” → `deleteAgentClient` / batch `delete`.  
3. Persist personal meta in `localStorage` / `sessionStorage` and call it production-ready (fails C38).  
4. Treat certificate `userAlias` as personal client alias for observer cards.  
5. Copy demo KPI / funnel numbers into production (C08, C18, C52).

---

## Impl candidate SHA

**Not available yet** for clients-parity product UI.  
`origin/cursor/remcard-cabinet-nav-r5-final-20261103` tip `1d8b5132` is cabinet-shell / prototype docs work — **not** accepted as the clients implementation candidate. Re-run contract comparison when impl agent publishes an exact clients-parity SHA + file list.

---

## Next auditor steps (this agent)

1. `page-matrix.json` for pages 79–123 + boundary 141–147.  
2. Action inventory from prototype `data-ca-action` / `data-observer-action` / `data-ca-input`.  
3. Element/state matrix skeleton with statuses mostly `NOT_STARTED` / `BLOCKED` / `EXCLUDED`.  
4. Bounded scripts under `scripts/clients-parity-20261113/**` (no product deps change, no heavy build).
