# Backend patch (navigator `bb7db4ca`) — not applied from Cloud Agent

Repository `karenavedikyan/remcard-navigator` is **not cloneable** from this environment (`Repository not found` / no push access). Apply on branch `cursor/remcard-employee-workspace-data-20261105` from **`bb7db4ca7165836f9165f9f851a5fffc5ba96b52`** only.

## GET `/api/partnership/list`

1. Remove upfront `user.role !== "PRO"` → 403 for org workplace members.
2. After session actor resolution, resolve **trusted organization read subject** from active membership (`GET /api/pro/context` equivalent server-side), not from `ownerId` query/body.
3. Extend org scope roles to include **`ORG_EMPLOYEE`**, **`ORG_TEAM_MEMBER`** (today only `BRANCH_MANAGER` / `BRANCH_EMPLOYEE` in bb7db4ca per audit).
4. Deny suspended / cross-org / missing membership before listing.
5. List query scoped to organization partnerships (owner principal); do not merge employee personal partnerships.
6. Optional additive response field: `readContext: { organizationId, principalProUserId, partnerType }` (frontend already derives from `/api/pro/context`).

## GET `/api/pro/wallet/settlements`

1. Remove raw PRO gate **before** `authorizeSettlementWalletRead`.
2. `authorizeSettlementWalletRead`: org members need **`canViewWallet`** from branch/team permissions; `ORG_OWNER` unchanged.
3. `resolveSettlementSubjects`: same org principal + permission checks; no ledger query when denied.
4. 403 body/message: distinguish **missing ledger permission** vs **not a partner** (frontend copy: «Нет права „Просмотр расчётов“»).

## GET `/api/pro/context` (additive)

Expose `effectivePermissions` (mirror `prof-i-permissions.ts`) for active branch/org membership so CLIENT employees receive `canViewWallet` / `canManagePartnerships` without elevating role to PRO.

## Tests (navigator)

- OPTOVIK owner: 2 partners in list.
- CLIENT `ORG_EMPLOYEE` Sergey: 200 list, same 2 rows, counterparty ids/labels vs owner principal.
- `canViewWallet=true` → settlements 200; `false` → 403 before ledger, no rows leaked.
- Negative: ownerId injection, suspended membership, cross-org, actor cache switch.
- Existing PRO owner / solo agent / personal list tests unchanged.

Frontend contract mirrors: `src/lib/employee-workspace-data/*-auth.ts` (vitest).
