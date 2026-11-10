# R1 Wave 2 — Live diagnosis: manager company wallet (Жуков / ОПТОВИК)

**QA source SHA (immutable):** `edb2c187e8102d27afdbdd47a4001b1ee19f5b60`  
**Partner live branch:** `release/partner-mobile-metrics-img7977-runtime-20261110`  
**Remote handoff (docs):** `docs/r1-wave2-wallet-frontend-audit-20261110` @ `9f83011561a1a2699d50ba784416190052991941` (push OK; not 403)  
**Runtime FE candidate:** none in this turn — **no concrete FE bug** on `edb2c187` with stated live grants

## Live facts (user-verified)

| Fact | Implication for FE |
|------|-------------------|
| Owner sees COMPANY `/settlements`: Мне должны / Я должен / aggregate / history | Shell = `BusinessOwnerWallet` + `WalletAccrualsWorkspace` `masterLedger` (not `incomingOnly`) |
| Жуков Сергей `RC-CHYA-PSBF`, руководитель, **not owner** | Must use `org-member-with-ledger`, not `pro-owner` |
| `canViewWallet=true`, same 8 rights on **all 6 branches + HO**, payouts false | Grants sufficient for `authorizeSettlementWalletRead`; payout UI must come only from API `payoutActions` |
| **No grant changes** | Generic rule, not personal exception |
| Generic rule: employees branch-scoped; **full org branch grant coverage** → company wallet like owner (read) | FE admit on `canViewWallet` grants; **no** `organizationActiveBranchIds` narrowing on wallet path (unlike partnerships list) |

## Admission chain (`edb2c187`) — expected PASS for Sergey

```text
requireProPageUser(/settlements)
  → cabinet-readiness: isEmployee + canAccessCabinet (CLIENT allowed; not PRO-only)

CabinetShell → requireProSession (same employee gate)
  → resolveCabinetPresentationBlock (invalid context / missing workplace → block **whole cabinet**, not wallet-only)

fetchCabinetPresentationServer → GET /api/pro/context

resolveCabinetNavMode + businessHomeNavContextFromPresentation
  → workplacePartnerType COMPANY + org-context → navMode `business-company`

resolveSettlementsPageShell → `master-wallet` shell label
  → branch: BusinessOwnerWallet when businessCopy && businessPartnerType (COMPANY from workplace)

resolveSettlementWalletReadAccess → authorizeSettlementWalletRead
  → non-owner org member: activeBranchPermissionGrants (ALL ACTIVE branchAssignments rows)
  → branchIdsWithPermission(..., "canViewWallet") → union of **all** granted branches (not activeBranch-only when list non-empty)

WalletAccrualsWorkspace: incomingOnly=false (default); fetchSettlements() no query params
```

### `activeBranch` narrowing — when it applies

File: `src/lib/employee-workspace-data/branch-assignment-auth.ts`

| Context shape | FE grants used |
|---------------|----------------|
| `branchAssignments` with `status === "ACTIVE"` (≥1 row) | **Full list**; `activeBranch` does **not** narrow |
| No ACTIVE rows, but `activeBranch` + top-level `effectivePermissions` | **Single** synthetic grant — risk if API omits ACTIVE rows while owner UI shows per-branch wallet |
| Sergey live (all branches + HO granted) | Expect **7+ ACTIVE rows** each with `effectivePermissions.canViewWallet: true` |

**`walletReadAuth.branchIds` is computed but not sent to settlements API** — company aggregate vs branch-scoped **row set** is runtime `GET /api/pro/wallet/settlements`, outside partner `src/` edit scope this wave.

### Intentional asymmetry (not a Sergey blocker)

`authorizePartnershipListRead` enforces `organizationActiveBranchIds` **full coverage** for non-owner org list (`partnership-list-auth.ts`).  
`authorizeSettlementWalletRead` only requires **≥1** branch with `canViewWallet` — aligns with **branch-scoped employees** still reaching `/settlements`; full-coverage managers are not blocked by this rule.

## FE correction decision

| Question | Answer on `edb2c187` |
|----------|----------------------|
| Concrete FE bug blocking owner-style company wallet for full-coverage manager? | **No** — given ACTIVE `branchAssignments` + flags match owner UI |
| Wrong shell (SpecialistMasterWallet vs BusinessOwnerWallet)? | Only if `workplacePartnerType` null while employee — blocked earlier at cabinet workplace gate |
| `incomingOnly` stripping payable? | **No** on business path |
| Role escalation / hardcode? | **None** in wallet read chain |
| Minimal FE patch required this wave? | **None** |

**Isolated runtime branch:** not created (no `src/` delta).

## If sandbox still differs from owner — collect **exact evidence**

| Symptom | Likely layer | What to capture |
|---------|--------------|----------------|
| «Нет права «Просмотр расчётов»» / no_active_branch_grant copy | FE gate | `authorizeSettlementWalletRead` reason; `branchAssignments[].status`; count of ACTIVE rows vs 7 |
| «Раздел недоступен для этого профиля.» after load | API | `GET /api/pro/wallet/settlements` status **403/404** ( `isSettlementsAccessDenied` ) |
| Specialist-style wallet tabs, not business copy | FE shell | `navMode`, `workplacePartnerType`, whether `businessCopy` null → fell through to `SpecialistMasterWallet` |
| Business chrome but empty / partial rows vs owner | Runtime API | settlements JSON shape vs owner same org; **not** fixable on partner FE without API change |
| Payout buttons visible | API + optional FE | response `payoutActions`; optional defense strip (post-approve only) |

Sandbox login (Comet unavailable): compare manager vs owner **network** for `/api/pro/context` and `/api/pro/wallet/settlements` on same org.

## Handoff remote

```bash
git ls-remote origin docs/r1-wave2-wallet-frontend-audit-20261110
# 9f83011561a1a2699d50ba784416190052991941

git rev-parse edb2c187e8102d27afdbdd47a4001b1ee19f5b60
```

Related doc: `docs/r1-wave2-wallet-frontend-audit-20261110.md`

## Short smoke (profile wallet gate)

```bash
pnpm run test:component -- \
  src/lib/employee-workspace-data/settlement-wallet-read-auth.test.ts \
  src/components/wallet-accruals/WalletAccrualsWorkspace.access-blocked.test.tsx \
  src/components/business-wallet/BusinessOwnerWallet.history-prop.test.tsx
```

---

*Docs-only; not part of runtime publish candidate.*
