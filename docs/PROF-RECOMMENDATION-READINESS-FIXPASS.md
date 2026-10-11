# PROF recommendation-readiness — fix-pass report

## Branch pair

- **remcard-navigator** `feat/prof-recommendation-readiness`
- **remcard-partner-platform** `feat/prof-recommendation-readiness`

## Base → HEAD (this fix-pass)

| Repo | Base | HEAD (after push) |
|------|------|-------------------|
| navigator | `27d465779e01dbaf3e61068d71b35fa83ca6a83b` | _(see git log)_ |
| platform | `2713153e103412cc75b20997ddd57ca250ebb9d1` | _(see git log)_ |

Stack: platform **3020**, navigator **3021** (`scripts/start-prof-recommendation-stack.mjs`). Worktrees under `/opt/cursor/worktrees/*-feat-prof-recommendation-readiness`.

## Fix-pass scope (factual)

1. **Profile draft sync** — `partnerActivities` in `DRAFT_KEYS` + normalized set compare; AGENT toggle dirty/revert covered in `profile-draft-sync.test.ts`.
2. **Focus & return** — whitelist `focus` query; `resolveFocusableElement` for input vs wrapper; name/city wrapped in `data-profile-focus` containers; `directionOrAgent` shows two links (specialization + agent); return copy «Вернуться к рекомендации» for `/recommendations/new`.
3. **Create-form draft v2** — scoped by `userId` + `organizationId` + `branchId`, TTL/shape validation, safe sessionStorage, reconcile stale partner keys after GET, restore-before-save ordering, logout clears all scopes via `LogoutButton`.
4. **Issuer resolver (navigator)** — effective working display name before stale legacy; `recommendationIssuerInputFromUserAndOrg` merges org city/categories/name without catalog gates; POST + available-partners use org-aware input.
5. **Tests** — unit (`profile-draft-sync`, `recommendation-*`, `certificateRecommendationIssuerReadiness`); PG `profRecommendationIssuer.integration.test.ts` (AGENT path + specialization PATCH + invalid discount + catalog unchanged + tagged cleanup).

## Automated checks (this run)

| Check | Result |
|-------|--------|
| platform vitest (draft/focus helpers) | pass |
| navigator vitest (issuer readiness unit) | pass |
| navigator PG integration (2 cases) | pass |
| platform `pnpm run build` | pass |
| navigator `pnpm run build` | pass |
| browser `prof-recommendation-readiness-browser.mjs` | **blocked on stack env** — requires worktree `.env.local` (JWT + DB + Basic Auth) and `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3020` at **build** time so mutating BFF Origin matches; script asserts POST 201, certificate id, PG row, draft restore |

Browser script scenarios (when stack is green): agent path 1440 light with pre-profile draft fill; specialization path 390 dark; POST 201 + `recommendation-create-success` + PG count.

## Not in scope

No PR/merge/deploy, no team-actions stack (3010/3011), no production profiles.
