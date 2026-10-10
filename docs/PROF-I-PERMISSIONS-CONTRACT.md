# PROF-I permissions contract (stream C)

**Version:** `2026-10-14.1`  
**Owners:** navigator backend + platform team UI (stream C). Stream D (payouts UX) must consume this contract unchanged.

## Action IDs (UI ↔ server)

Stable string IDs match the accepted prototype (`team-flex.js`). Each maps to one or more `BranchEmployee` boolean columns scoped to a **branch** (or org head-office row with zero branch employees).

| Action ID | User-facing capability | DB flag(s) | Notes |
|-----------|------------------------|------------|-------|
| `clients` | Clients, requests, recommendations | `canManageLeads` | |
| `scan` | Scan / verify certificate (no sale) | `canManageCertificates` | Does **not** imply sale or accrual |
| `sale` | Confirm sale with program accrual | `canActivateCertificates` | Store preview/order gate |
| `own` | View own operations history | `canViewOwnOperations` | Actor-scoped reads only |
| `ledger` | View branch settlements / accruals | `canViewWallet` | Scoped by branch context; **not** payout |
| `cash` | Record cash bonus payout (fact) | `canPayBonusCash` | Requires `ledger`; independent of `transfer` |
| `transfer` | Record transfer bonus payout (fact) | `canPayBonusTransfer` | Requires `ledger`; independent of `cash` |
| `catalog` | Edit branch catalog | `canManageCatalog` | |
| `terms` | Edit partnership terms | `canManagePartnerships` | |
| `team` | Manage staff in allowed branches | `canManageEmployees` | Cannot exceed actor's own grants |

Legacy columns unchanged: `canManageCrossRequests`, `BranchRole` presets (used only when invite snapshot absent).

## Dependencies (server-enforced)

- Enabling `cash` or `transfer` requires `canViewWallet` (`ledger`).
- Removing `ledger` clears both payout flags.
- Empty explicit set → all flags false (no hidden defaults from job title or `BranchRole` alone when snapshot present).
- `canViewWallet` **never** grants `canPayBonusCash` / `canPayBonusTransfer`.
- Existing staff: migration leaves new payout flags **false**; role presets do not auto-enable payout.

## Scope model

| Scope | Meaning |
|-------|---------|
| `ORGANIZATION` invite | `OrganizationMember` + optional `HEAD_OFFICE` (no branch ops) or `BRANCH_STAFF` |
| Branch IDs | Snapshot at invite create; `allCurrentBranchesSnapshot` stores resolved IDs only |
| Per-branch permissions | Each `BranchEmployee` row holds effective flags; invite stores `permissionsSnapshot` + optional `branchPermissionsSnapshot` when mixed |
| Head office | `HEAD_OFFICE` with empty `branchIds` — org-level membership without store gates until branches attached |

## DTOs

### `ProfIPermissionFlags` (JSON / API)

```typescript
type ProfIPermissionFlags = {
  canManageLeads: boolean;
  canManageCertificates: boolean;
  canActivateCertificates: boolean;
  canViewOwnOperations: boolean;
  canViewWallet: boolean;
  canPayBonusCash: boolean;
  canPayBonusTransfer: boolean;
  canManageCatalog: boolean;
  canManagePartnerships: boolean;
  canManageEmployees: boolean;
  canManageCrossRequests: boolean;
};
```

### Invite create (POST `/api/pro/invites`, ORGANIZATION / BRANCH / SOLO)

Optional (I2):

- `defaultPermissions`: `ProfIPermissionFlags` — normalized server-side
- `branchPermissions`: `Record<branchId, ProfIPermissionFlags>` — when `permissionsMixed: true`
- `permissionsMixed`: boolean

When omitted, legacy `role` → `employeePermissionValuesFromRole(role)` (payout flags false for SELLER/VIEWER; MANAGER gets wallet read only).

Stored on `StaffInvite`: `permissionsSnapshot`, `branchPermissionsSnapshot`, `permissionsMixed`.

### Team member update (PATCH `/api/pro/organization/team-members/:userId`)

Optional:

- `defaultPermissions`, `branchPermissions`, `permissionsMixed`
- `branchIds`, `membershipKind`, `position`, `fullName` (unchanged H5)

### Permission template (copy-only)

`OrganizationPermissionTemplate`: `{ id, organizationId, name, permissions: ProfIPermissionFlags, createdAt }`  
POST creates snapshot; applying template copies flags into wizard — **does not** mutate existing staff.

### Invite preview (GET `/api/invite/:token`)

Adds when pending: `position`, `permissionLabels[]`, `branchLabels`, `membershipKind` (existing), optional `permissionsSummary`.

## Authorization helpers (navigator)

Implemented in `src/lib/prof-i-permissions.ts`:

| Helper | Use |
|--------|-----|
| `normalizePermissionFlags(input)` | Dependency rules, reject contradictory payload |
| `flagsFromActionIds(ids: ProfIActionId[])` | Template / UI checkbox → flags |
| `actionIdsFromFlags(flags)` | Overview / editor |
| `permissionSlice(employee)` | API responses |
| `assertStaleStaffInvitePermissionGrants(...)` | After branch set stale guard |
| `authorizeStoreScan(user, branchId)` | Scan route |
| `authorizeBonusPayout(params)` | **D must use** for `POST /api/bonus/[id]/pay` |

### `authorizeBonusPayout`

```typescript
type AuthorizeBonusPayoutInput = {
  actorUserId: string;
  bonusId: string;
  payoutMethod: 'CASH' | 'TRANSFER';
  /** Resolved store-side branch for the obligation (from Order.branchId) */
  branchId: string | null;
};

type AuthorizeBonusPayoutResult =
  | { ok: true; bonus: Bonus; storeUserId: string }
  | { ok: false; status: number; error: string };
```

Rules:

1. Actor is org owner for the store **or** `BranchEmployee` on `branchId` with matching payout flag.
2. Bonus belongs to store user's obligation chain (`order.storeUserId`); actor must be allowed payer for that branch.
3. Owner retains legacy full payout access on own store account (H compatibility).
4. `canViewWallet` alone → deny payout.

## Stale invite (permissions)

When owner PATCH reduces permissions on a branch the member **retains**, set `OrganizationMember.permissionsAccessChangedAt`. Pending invites created before that timestamp cannot **increase** flags on that branch beyond what the member had at change time (mirrors H5 branch stale guard).

## Audit

Team permission changes: `AuditLog` action `PROF_I_TEAM_PERMISSIONS_CHANGED` with `{ organizationId, targetUserId, branchIds?, actorUserId }` — no invite tokens.

## Shared merge notes (for stream E)

| Area | Owner | C change |
|------|-------|----------|
| `prisma/schema.prisma` | E merges | C prefix `20261014_prof_i_c_*` |
| `employee-permissions.ts` / `prof-i-permissions.ts` | C | Extended flags + helpers |
| `POST /api/bonus/[id]/pay` | C auth, D UX | Uses `authorizeBonusPayout` |
| BFF allowlist | C adds template routes | Document in PROF-I-C-REPORT |
| AppShell / theme / inbox | A / B | **No edits** in C worktrees |

## Changelog

| Version | Change |
|---------|--------|
| 2026-10-14.1 | Initial I2 contract for parallel D start |
