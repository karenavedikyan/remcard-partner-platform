# PROF recommendation-readiness — fix-pass report

## Branch pair

- **remcard-navigator** `feat/prof-recommendation-readiness`
- **remcard-partner-platform** `feat/prof-recommendation-readiness`

## Base → HEAD (this fix-pass)

| Repo | Base | HEAD (after push) |
|------|------|-------------------|
| navigator | `27d465779e01dbaf3e61068d71b35fa83ca6a83b` | `32ffea86e1e0d93519332fe22b2093dcf15caf45` |
| platform | `2713153e103412cc75b20997ddd57ca250ebb9d1` | `73d02bf2fed98fbb3cd8acd18a7d220f785cb97b` |

Stack: platform **3020**, navigator **3021**. Worktrees: `/opt/cursor/worktrees/*-feat-prof-recommendation-readiness`. Start with `.env.local` sourced (JWT + staging Basic Auth); platform build needs `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3020`.

## Fix-pass scope (factual)

1. **Profile draft sync** — `partnerActivities` in `DRAFT_KEYS` + normalized set compare; AGENT toggle dirty/revert in `profile-draft-sync.test.ts`.
2. **Focus & return** — whitelist `focus` query; `resolveFocusableElement`; name/city wrappers; dual CTAs for `directionOrAgent`; «Вернуться к рекомендации» for `/recommendations/new`.
3. **Create-form draft v2** — scoped `userId` + `organizationId` + `branchId`, TTL/shape validation, safe sessionStorage, reconcile stale partner keys, restore-before-save, logout cleanup.
4. **Issuer resolver (navigator)** — effective working display name before stale legacy; `recommendationIssuerInputFromUserAndOrg`; org city/categories without catalog gates.
5. **Tests** — unit helpers; PG `profRecommendationIssuer.integration.test.ts` (AGENT + specialization PATCH + invalid discount + catalog unchanged + tagged cleanup).

## Automated checks (2026-10-11)

| Check | Result |
|-------|--------|
| platform vitest (`profile-draft-sync`, `recommendation-create-draft`, `recommendation-profile-focus`) | **16 passed** |
| navigator vitest (`certificateRecommendationIssuerReadiness`) | **9 passed** |
| navigator PG `profRecommendationIssuer.integration.test.ts` | **2 passed** |
| platform `pnpm run build` (3020 app URL) | **pass** |
| navigator `pnpm run build` | **pass** |
| browser `prof-recommendation-readiness-browser.mjs` | **PASS** — agent 1440 light (draft restore, POST 201, PG row); specialization 390 dark (POST 201, PG row); report `/opt/cursor/artifacts/screenshots/prof-recommendation-browser-report.json` |

## Not in scope

No PR/merge/deploy, no team-actions stack (3010/3011), no production profiles.
