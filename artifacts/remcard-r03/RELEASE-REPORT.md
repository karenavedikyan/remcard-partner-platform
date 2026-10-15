# R03.2 release report

## PRs and SHAs (post R03.2 commit — see git for exact HEAD after push)

| Repo | PR | Base branch |
|------|-----|-------------|
| remcard-navigator | [#680](https://github.com/karenavedikyan/remcard-navigator/pull/680) | `release/prof-backend-v1-20261007` (restored from erroneous `cursor/m4c-order-idempotency`) |
| remcard-partner-platform | [#15](https://github.com/karenavedikyan/remcard-partner-platform/pull/15) | `release/prof-v1-20261007` |

**Reviewed code baseline (start of R03.2):** backend `1e379ee915c5094f65b8aef688e823c6fad490a3`, frontend `ba58fe1649d72bed2d558c584c110790dbf80223`.

### Branch / merge-base (item 0)

- R03 branch adds **2 commits** over `release/prof-backend-v1-20261007`; merge-base matches release tip `eef176c9`.
- Prior PR base `cursor/m4c-order-idempotency` was **125 commits skew** unrelated to R03; base on #680 **updated** to `release/prof-backend-v1-20261007` without force-push or rebase.
- **R02-LIVE-UI #14** remains a **separate dependency** (not merged/published in this work); R03 local stack reuses R02 fixture/stack only.

## A — Stable create idempotency

- Frontend: `create-idempotency.ts` + `CertificateCreateForm` keeps one key per payload hash until success or payload change.
- BFF: forwards `Idempotency-Key` for `POST /api/pro/agent-certificates`.
- Backend: advisory lock + unique-conflict replay in store create transaction.
- Tests: `create-idempotency.test.ts`, `profR03CreateIdempotency.integration.test.ts` (retry, conflict, parallel).

## B — Prototype-aligned actions & detail

- `AgentCertificateDetail`: store `CertificateResultView` (QR/PDF/public), private rename, SVG row icons, disable confirm, test-public notice.
- Lists/detail/table: full action sets; client share without notes; `AgentClientFormDialog`.

## C — Codes & isolation

- Lookup: only known issuer prefixes strip display form; unknown → legacy full string.
- Guest: agent-branded title «Сертификат Ремкард», `displayCode` on public page.
- Prof-test: `GET /api/pro/context`; public excludes `isProfTestUser`.

## D — Controlled migration

- `scripts/prof-r03-migrate.mjs` + integration test (manifest checksum, apply/after/repeat on disposable `DATABASE_URL`).
- Migration SHA256: `b67ab11176f50e3b5d4ce9798bbfdd99a701afd11aa7133d5d15078a6a1c1168`.

## E — Local acceptance run

- Script: `scripts/r03-local-acceptance.mjs` (stack: `r02-local-stack.mjs` + `PROF_R03_AGENT_CERTIFICATES_ENABLED=true`).
- **Backend direct (3031):** client create/rename partial PATCH, idempotency retry, single persisted cert — **PASS** (`local-acceptance-report.json`).
- **BFF (3032) R03 API:** `GET /api/remcard/api/pro/r03/status` → **403 Path not allowed** in this environment while unit allowlist tests pass — **NOT_VERIFIED** full browser→BFF→backend for R03 mutations (needs Next dev reload investigation; not production).

## F — Visuals

- Captured under `artifacts/remcard-r03/visual/` (impl 1440/375 certificates+clients, ref `roles.html` 1440).
- See `visual-report.md`.

## Verdict

**NO_GO for publication** — code/tests for R03.2 items are in place, but **full BFF R03 proxy path was not verified green** in the local stack run; admin→test-agent browser chain not executed end-to-end in this turn (visuals are gate/login shell without authenticated R03 data on screenshots).

No merge, deploy, production DB, or gate changes performed.
