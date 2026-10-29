# SHARED-CHANGE-REQUEST — Admin R1 (`feat/admin-release1-prototype-20261029`)

Admin agent **не коммитит** shared patches. Ниже — заготовки; exact diffs после появления эталона + backend contracts.

## Status

Сейчас: **нет готовых shared patches** (implementation blocked). Запросы ниже — предвидимые точки интеграции.

---

### SCR-001 — BFF allowlist for new admin R1 routes

- **Path:** `src/lib/remcard-proxy.ts` (+ `src/lib/remcard-proxy.test.ts`)
- **Rationale:** New read/command adapters for R1 (partner card, reviews actions, clients, certificates, deals, team/StaffRole, audit journal, RemScore analytics) must pass BFF allowlist. Editing proxy outside shared process is forbidden.
- **Patch proposal:** After backend routes exist on `feat/admin-release1-prototype-20261029` (navigator), add exact `methods`+`pattern` entries mirroring existing `/api/pro/admin/**` style; GET-only for reads; mutating methods only for auth-protected existing-model commands. Tests: allow + deny extras.
- **Owner after approval:** shared/coordinator — not Partners agent.

### SCR-002 — Partner primary kind (dependency, do not invent)

- **Paths:** `src/lib/partner-kind-ui.ts`, possibly `src/lib/types.ts`, search DTOs — owned by type-task `feat/partner-primary-kind-unify-20261029` (`a140bc8c…` / backend `af8959ee…`).
- **Rationale:** Registry facets/card labels must use one canonical primary kind; Admin must **adapter**-consume, not fork `includes("AGENT")`.
- **Patch proposal:** None from Admin. Wait Computer acceptance. If registry DTO lacks fields Admin needs after that merge, file a follow-up SCR with exact field list.

### SCR-003 — Global layout / nav / CSS (only if unavoidable)

- **Paths:** root `layout`, global CSS, `AppShell`, auth providers.
- **Rationale:** Prefer scoped `Admin.module.css` / `admin-r1` CSS. Request only if staff/partner shell conflict blocks R1 isolation.
- **Patch proposal:** TBD after reference; default = isolate under `/admin` owned files.

### SCR-004 — package-lock / Prisma

- **Not requested.** R1 forbids Prisma/schema/migrations. No dependency bumps planned for Admin R1.
