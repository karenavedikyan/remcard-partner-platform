# PROF recommendation-readiness — fix-pass report

## Branch pair

- **remcard-navigator** `feat/prof-recommendation-readiness`
- **remcard-partner-platform** `feat/prof-recommendation-readiness`

## SHAs (no self-referential docs tip in code table)

| | Value |
|---|--------|
| **testedCodeSha (navigator)** | `32ffea86e1e0d93519332fe22b2093dcf15caf45` |
| **testedCodeSha (platform, before this delta)** | `93ecd5d735ba125a1e58244cfcb4ddb0c114bee5` |
| **docs tip (platform, after push)** | see `git rev-parse HEAD` on platform branch after latest commit |

Earlier report rows referenced `bbd3d224…`; that was stale relative to branch tip at the time of the first fix-pass push.

## Delta (this pass)

1. **CertificateCreateForm** — persist draft only after successful `GET /api/pro/context` (not userId/null/null on error); scope error UI + retry; `hydratedScopeKey` barrier so restore completes before autosave; scope switch re-hydrates without copying in-memory values across scopes.
2. **recommendation-create-draft** — safe `sessionStorage` getter (SecurityError-safe).
3. **Browser** — specialization path selects a service under «Работы и услуги», asserts PATCH `serviceSpecializationIds`, no AGENT / no product categories; draft restore (partner, discount 7, validity 6) before POST 201 + PG.

Stack **3020/3021** with `.env.local` sourced on `next start`.

## Not in scope

No PR/merge/deploy, team-actions/production/real profiles.
