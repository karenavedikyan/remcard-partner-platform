# RemCard R03.2-CLOSE — Release Report

## Verdict: **READY_FOR_PUBLICATION**

Single honest local acceptance completed on **admin-test stack** (admin login → test-agent → R02-completed profile → R03 UI/BFF). No force-push, merge, deploy, or production DB changes.

## Code refs (unchanged PR bases)

| Repo | Branch | HEAD | Base |
|------|--------|------|------|
| remcard-partner-platform | `cursor/r03-agent-clients-certs-b3e3` | `eaa33f7` (after R03.2-CLOSE) | `release/prof-v1-20261007` |
| remcard-navigator | `cursor/r03-agent-clients-certs-b3e3` | `251ec8bb` (after R03.2-CLOSE) | `release/prof-backend-v1-20261007` |

PRs: frontend [#15](https://github.com/karenavedikyan/remcard-partner-platform/pull/15), backend [#680](https://github.com/karenavedikyan/remcard-navigator/pull/680).

## R03.2-CLOSE fixes (this turn)

1. **Stand + acceptance** — `scripts/r03-local-acceptance.mjs` requires BFF `GET /api/pro/r03/status` = 200 + `eligible`, healthy `/certificates` and `/clients` (headings + primary actions), admin→test-agent browser context, BFF idempotency retry; fails closed on errors. Frozen prototype served over HTTP (`127.0.0.1:8765`), not `file://`. **Admin DB** `remcard_admin_test_012` gets `prisma db push` for R03 tables via admin stack + acceptance preamble (fixes prior 500 on client create).
2. **Client actions + safe share** — full SVG row actions (edit, share, archive/restore, delete) in cards/list; `SharePreviewDialog` opt-in for phone/email/city (default name-only) with regression test.
3. **Lookup consumers** — `POST /api/client/certificates/add` uses shared display/legacy resolver + issuer prefix check + `isProfTestUser` exclusion; integration tests for display/raw/QR, wrong prefix, test-owner isolation, public JSON.
4. **Migration test safety** — `assertProfR01RouteTestDb` before any connect/DDL; negative tests for checksum mismatch and untracked partial schema.
5. **Preserved** — idempotency key, advisory lock, private alias, controlled runner, pagination, SVG actions (unchanged scope).

## Evidence

- **Acceptance JSON:** `artifacts/remcard-r03/local-acceptance-report.json` (`ok: true`, `verdict: READY_FOR_PUBLICATION`).
- **BFF:** `bffR03Status: 200`, `bffIdempotencyRetry: 200`.
- **Browser:** test session active, client create, share default-off + phone opt-in.
- **Visuals (verified impl, 4 impl/ref pairs + detail + 320 smoke):** `artifacts/remcard-r03/visual/impl-*` / `ref-*` — working R03 sections only (no login/404).
- **Migration:** `node --test scripts/lib/__tests__/prof-r03-migrate.integration.test.mjs` pass; manifest SHA `b67ab11176f50e3b5d4ce9798bbfdd99a701afd11aa7133d5d15078a6a1c1168`.

## Environment note

`r02-local-stack` BFF probe on port **3032** can hit a **stale listener** returning `403 Path not allowed` while a fresh Next dev on another port (e.g. 3040/3050) returns `401` (route allowed). Acceptance intentionally uses **admin-test** ports **3040/3041** after schema push; do not treat direct-backend-only smoke as UI acceptance.

## Remaining / out of scope

- R02-LIVE-UI #14 — separate PR, not merged here.
- R04/R05, production merge/deploy, Tandoor/staff/branches/notifications — not touched.
