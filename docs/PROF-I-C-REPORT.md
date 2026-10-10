# PROF-I stream C — platform report

**Branch:** `feat/prof-i-team-permissions`  
**Contract:** `docs/PROF-I-PERMISSIONS-CONTRACT.md` (`2026-10-14.1`)  
**Navigator backend reference:** `ef11d03b` (stream C navigator worktree; not modified here)

## Delivered UX

| Area | Implementation |
|------|----------------|
| Free-form position | Invite wizard step 1 + member editor (`position` field, not tied to grants) |
| Granular permission matrix | `ProfileTeamPermissionMatrix` + `src/lib/prof-i-permissions.ts` (action IDs ↔ flags, ledger/payout deps) |
| Copy-only templates | Built-in presets + org templates via GET/POST `/api/pro/organization/permission-templates` (apply copies flags only) |
| Branch / head office | Wizard step 2: `membershipKind`, branch multi-select, head-office explainer block |
| Invite wizard (3 steps) | `ProfileTeamInviteWizard`: должность и права → подразделения → проверка |
| Per-scope overrides | Mixed mode + per-branch scope editor; member editor parity |
| Team list | `ProfileTeamSection` cards with permission summary (not legacy role labels) |

## BFF allowlist (platform only)

Added to `src/lib/remcard-proxy.ts`:

- `GET /api/pro/organization/permission-templates`
- `POST /api/pro/organization/permission-templates`

Existing invite and team-member routes unchanged.

## Migrations

None in platform (`20261014_prof_i_c_*` not required).

## Out of scope (per stream charter)

- AppShell / theme / inbox — not touched
- No PR opened; no production deploy; invite flow creates links via existing dev/staging API only when backend is configured

## Tests

- `src/lib/prof-i-permissions.test.ts` — dependency normalization
- `src/lib/prof-i-team-ui.test.ts` — template / toggle helpers
- `src/components/profile/ProfileTeamPermissionMatrix.test.tsx`
- `src/components/profile/ProfileTeamInviteWizard.test.tsx`
- `src/lib/remcard-proxy.test.ts` — permission-templates allowlist

Run: `npm run test:component`, `node --import tsx --test src/lib/prof-i-permissions.test.ts`, `npx tsc --noEmit`, `npm run build`.

## Files (primary)

- `src/components/profile/ProfileTeamSection.tsx`
- `src/components/profile/ProfileTeamInviteWizard.tsx`
- `src/components/profile/ProfileTeamMemberEditor.tsx`
- `src/components/profile/ProfileTeamPermissionMatrix.tsx`
- `src/lib/prof-i-permissions.ts`, `src/lib/prof-i-team-ui.ts`, `src/lib/prof-i-member-permissions.ts`
