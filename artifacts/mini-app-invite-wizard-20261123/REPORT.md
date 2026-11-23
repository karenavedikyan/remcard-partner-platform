# Mini-app partner invite wizard

## Base commits

| Repo | Role | SHA |
|------|------|-----|
| remcard-partner-platform | FE | `1ef028e9706cf9ad2c756f07587dadc4be2c1933` |
| remcard-navigator | BE | `fbaa35f7b646e3b82c630af0753725e8cb379e59` |

## Branches

- FE: `cursor/mini-app-partner-invite-wizard`
- BE: `cursor/mini-app-partner-invite-wizard` @ `d88742b9133588aeaa7ae0a8e4def9a348c379c6`

## Backend patch

```bash
git apply --check artifacts/mini-app-invite-wizard-20261123/be-from-fbaa35f7.patch
# from remcard-navigator at fbaa35f7:
git apply artifacts/mini-app-invite-wizard-20261123/be-from-fbaa35f7.patch
```

SHA-256: see `CHECKSUMS.txt` (`be-from-fbaa35f7.patch`).

## New BE routes (mini-app session + pilot gates)

- `GET /api/pro/mini-app/partnership/invite-context` — `kind` `discussion` (agent) vs `terms`, limits, `inviterBusinessSide`, `categoryPlan`
- `POST /api/pro/mini-app/partnership/discussion-invite` — agent only, reuses `createPartnershipDiscussionInvite`
- `POST /api/pro/mini-app/partnership/link-invite` — specialist/store/company/staff delegation, reuses `createPartnershipLinkInvite` + audit

Runtime `GET /api/partnership/link-invite` unchanged. Test fix: `route.org-staff.test.ts` mocks `listPartnershipLinkInvitesLegacy` / `listPartnershipLinkInvitesV2`.

## FE changes

- `MiniAppInvitePartner`: 3-step wizard (Партнёр / Сообщение / Проверка), ready screen with copy (text+URL), manual fallback, double-submit guard, transport vs API errors
- BFF allowlist + mini session cookies for three routes above
- No change to full-cabinet partnership routes semantics

## vs prototype spec

- No demo URLs or fake percentages in runtime; `previewPath`/`expiresAt` from API
- Terms note max **400** (full cabinet wizard); discussion subject max **500** (server)
- Agent flow has no «предполагаемый тип»; terms flow requires type when inviter is specialist/company
- Ready screen omits prototype footnote about demonstration links
- Staff without `canManagePartnerships`: blocked at invite-context (same as cabinet)

## Tests run in this environment

| Suite | Result |
|-------|--------|
| BE `src/app/api/pro/mini-app/__tests__` + `miniAppPartnershipInviteRoute` + `route.org-staff` | **11 passed** |
| FE `invite-wizard.test.ts` + `MiniAppInvitePartner.test.tsx` | **10 passed** (this VM) |
| Isolated DB invite create + public page | **NOT_RUN** (no PG harness here) |
| MAX/Telegram browser | **NOT_RUN** on this agent VM |

User-reported: FE 50/50 + 4 browser checkout scenarios on their machine.

## Changed files (summary)

**BE:** `miniAppPartnershipInviteRoute.ts`, three route handlers, tests, `route.org-staff.test.ts` mock fix.

**FE:** `MiniAppInvitePartner.tsx`, `MiniAppRoot.tsx`, `mini-app/api.ts`, `invite-wizard.ts`, `remcard-proxy.ts`, styles, tests.