# Mini-app partner invite wizard

## Base commits

| Repo | Role | SHA |
|------|------|-----|
| remcard-partner-platform | FE | `1ef028e9706cf9ad2c756f07587dadc4be2c1933` |
| remcard-navigator | BE | `fbaa35f7b646e3b82c630af0753725e8cb379e59` |

## Branches (post QA pass)

- FE: `cursor/mini-app-partner-invite-wizard` — see `FE_HEAD` in `CHECKSUMS.txt`
- BE: `cursor/mini-app-partner-invite-wizard` — see `BE_HEAD` in `CHECKSUMS.txt`

## Independent QA (user machine, local PostgreSQL)

Synthetic embedded MAX/Telegram sessions:

- Terms + discussion create per host — persistence OK
- Unauthenticated / wrong-kind — rejected
- Public preview API — **PENDING** (not in scope here)
- Not full host/visual QA

Targeted automated suites (user): **59** FE mini-app, **36** proxy, **33** BE — pass before this fix round.

## FE blocker fixed: `MotionlessInfoCard`

Review/ready blocks were rendered as lowercase custom element `<motionlessInfoCard>` (invalid in DOM), so React ignored `onEdit` and body text was not visible in tests or browsers.

Fix: PascalCase function component `MotionlessInfoCard` with `data-testid` on review partner/message and ready message. Tests assert visible review copy and working edit shortcuts (step 1 / 2). Unknown transport errors: no «Повторить», «Создать» stays enabled.

## Backend fix: `NextResponse` runtime

`miniAppPartnershipInviteRoute.ts` used `import type { NextResponse }` but constructs `new NextResponse` in session/role guards — corrected to value import (401 mini-session test was failing).

Invite-only role: `resolveMiniAppPartnershipInviteRole` lets org staff (`UserRole.CLIENT` + manage) into terms flow without widening other mini-app bootstrap roles.

## Tests run on agent VM (after fixes)

| Suite | Result |
|-------|--------|
| FE mini-app vitest (`src/components/mini-app`, `src/lib/mini-app`) | **61 passed** |
| FE `MiniAppInvitePartner.test.tsx` + `invite-wizard.test.ts` | **12 passed** |
| BE mini-app partnership routes + `miniAppPartnershipInviteRoute` + role + org-staff | **21 passed** (7 route + unit files) |

## TypeScript release gate

| Repo | `tsc --noEmit` |
|------|----------------|
| **remcard-partner-platform** | **PASS** (clean) |
| **remcard-navigator** | **FAIL** (pre-existing repo-wide errors: wallet accrual types, bigint in `test/user-deletion.test.ts`, etc.). **No errors** in `miniAppPartnershipInviteRoute.ts` or new partnership invite route tests after `NextResponse` fix. |

## Backend patch

```bash
git apply --check artifacts/mini-app-invite-wizard-20261123/be-from-fbaa35f7.patch
# from remcard-navigator at fbaa35f7:
git apply ../remcard-partner-platform/artifacts/mini-app-invite-wizard-20261123/be-from-fbaa35f7.patch
```

SHA-256: `CHECKSUMS.txt`.

## New BE routes (mini session + pilot gates)

- `GET /api/pro/mini-app/partnership/invite-context`
- `POST /api/pro/mini-app/partnership/discussion-invite`
- `POST /api/pro/mini-app/partnership/link-invite`

Runtime full-cabinet `GET /api/partnership/link-invite` unchanged.

## FE summary

- `MiniAppInvitePartner`: 3-step wizard, server `categoryPlan`, ready + copy, double-submit lock, `backDisabled` while creating
- BFF allowlist + mini cookies for the three routes above

## Unknown outcome recovery (FE `cursor/mini-app-invite-unknown-recovery`)

Before each create POST, `armMiniInviteRecoveryGuard` runs synchronously in `sessionStorage` keyed by `embeddedContext + platform + branchId + kind` (browser session scopes the actor). On transport / 5xx / malformed response the guard stays armed: **no further POST**, create button disabled after back/remount/reload, copy points user to full cabinet «Партнёры». Confirmed 4xx clears the guard — safe retry. No idempotency keys. Test: attempt → network lost → one POST only across click + remount.

## vs prototype spec

- Terms note max **400**; discussion subject max **500**
- Agent flow: no intended partner type; terms: type when required by server plan
- Staff without manage: blocked at invite-context (cabinet parity)
- Agent discussion for pure CLIENT staff without PRO principal — still blocked by design

## Changed files (summary)

**BE:** `miniAppPartnershipInviteRoute.ts`, three route handlers, `partnershipInvite.routes.test.ts`, `miniAppPartnershipInviteRole.test.ts`, org-staff mock fix.

**FE:** `MiniAppInvitePartner.tsx`, tests, `MiniAppSubpage.tsx`, `api.ts`, `invite-wizard.ts`, proxy allowlist.