# Unified login + specialist release prep (NOT for immediate publish)

Single coordinated release candidate replacing a separate LOGIN-LAYOUT production drop. **No deploy, no Timeweb, no prod DB, no flag enable in this prep.**

## Scope (minimal)

- Login page layout (PR #29 merged on release) + build fix from PR #30 branch (included in unified candidate, **PR #30 not merged**)
- Full R06 specialist profile/catalog/taxonomy proposals (application code pin `11f512e…`, layout/login product pin `27d339b…`)
- Backend operator migration CLI (3 pinned SQL migrations)

## Pin chain

| Stage | Platform | Navigator |
|-------|----------|-----------|
| Release base | `release/prof-v1-20261007` @ `e6ba468…` | `release/prof-backend-v1-20261007` @ `c9cdef…` |
| Unified candidate | `cursor/unified-login-specialist-prep-01` (see manifest JSON) | same branch name @ `d9edf2b…` |

Historical visual capture SHAs ≠ unified candidate SHAs.

## Production build (Timeweb-style frontend)

```bash
rm -rf .next && npm ci --include=dev && npm run build
```

`tsconfig.json` excludes `artifacts/**/*.nav.fixture.tpl` so materialized navigator cleanup/seed templates are not typechecked as app code.

## Migrations (navigator, operator — disposable rehearsal only)

Checksums: see `artifacts/remcard-r06-specialist/R06-RELEASE-PREP-01-RUNBOOK.md`.

`PROF_R06_SPECIALIST_PROFILE_ENABLED` — **default OFF**, global for all eligible specialists (not canary).

## Human-gated release order

1. Verified backup + restore point — **NOT_VERIFIED**
2. Operator read-only preflight on production DB — **NOT_RUN**
3. Apply 3 R06 migrations (operator apply CLI)
4. Deploy backend with gate **OFF**
5. Deploy frontend (unified login + specialist UI) with gate **OFF**
6. Separate coordinated global gate enable + limited smoke
7. Addressed cleanup of rehearsal fixtures only

No down migration. Rollback app refs only after operator verification — **NOT_VERIFIED**.

## PR #30

Build fix is **included** in unified platform branch; do **not** merge PR #30 separately for this release path.
