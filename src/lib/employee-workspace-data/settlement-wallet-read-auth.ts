import { isOrgWorkplaceMemberRole } from "@/lib/cabinet-presentation/resolve";
import { validateProContextSnapshot } from "@/lib/cabinet-presentation/validate";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import {
  activeBranchPermissionGrants,
  branchIdsWithPermission,
  hasFullActiveBranchCoverage,
} from "./branch-assignment-auth";

export type SettlementWalletReadDenyReason =
  | "raw_pro_gate"
  | "missing_context"
  | "invalid_context"
  | "suspended"
  | "no_active_branch_grant"
  | "missing_wallet_permission"
  | "foreign_or_revoked_membership"
  | "not_org_workplace";

export type SettlementWalletReadAuthResult =
  | {
      allowed: true;
      mode:
        | "pro-owner"
        | "pro-solo"
        | "org-member-with-ledger"
        | "org-member-company-ledger";
      branchIds?: string[];
    }
  | { allowed: false; reason: SettlementWalletReadDenyReason };

export type SettlementWalletPaymentAuthResult =
  | { allowed: true; branchIds: string[] }
  | { allowed: false; reason: SettlementWalletReadDenyReason };

/**
 * Mirror of navigator authorizeSettlementWalletRead — no upfront user.role !== PRO gate;
 * no ok:true when branchEmployee.count===0 without explicit ACTIVE grant + canViewWallet.
 */
export function authorizeSettlementWalletRead(input: {
  user: Pick<AuthUser, "role" | "id">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): SettlementWalletReadAuthResult {
  if (input.proContext?.role === "PARTNER_EMPLOYEE_SUSPENDED") {
    return { allowed: false, reason: "suspended" };
  }

  const validation = validateProContextSnapshot(input.proContext);
  const role = input.proContext?.role?.trim() ?? "";
  const proContext = input.proContext;

  if (input.contextReady && proContext && validation.ok !== true) {
    return { allowed: false, reason: "invalid_context" };
  }

  if (isOrgWorkplaceMemberRole(role) && proContext?.organization?.id) {
    if (!input.contextReady || validation.ok !== true) {
      return { allowed: false, reason: "missing_context" };
    }
    if (role === "ORG_OWNER") {
      return { allowed: true, mode: "pro-owner" };
    }

    const grants = activeBranchPermissionGrants(proContext);
    if (grants.length === 0) {
      return { allowed: false, reason: "no_active_branch_grant" };
    }

    const walletBranchIds = branchIdsWithPermission(grants, "canViewWallet");
    if (walletBranchIds.length === 0) {
      return { allowed: false, reason: "missing_wallet_permission" };
    }

    const ownerId = proContext.organization?.ownerId?.trim();
    if (!ownerId) {
      return { allowed: false, reason: "foreign_or_revoked_membership" };
    }

    // Full canViewWallet coverage of every active org branch → company ledger read
    // (unscoped GET). Not an owner promotion; requisites/payout stay owner-only.
    if (
      hasFullActiveBranchCoverage(
        proContext.organizationActiveBranchIds,
        walletBranchIds,
      )
    ) {
      return {
        allowed: true,
        mode: "org-member-company-ledger",
      };
    }

    return {
      allowed: true,
      mode: "org-member-with-ledger",
      branchIds: walletBranchIds,
    };
  }

  if (input.user.role !== "PRO") {
    return { allowed: false, reason: "raw_pro_gate" };
  }

  return { allowed: true, mode: role === "ORG_OWNER" ? "pro-owner" : "pro-solo" };
}

/** Payout / cash / transfer — separate from ledger read; never implied by read access. */
export function authorizeSettlementWalletPaymentMutations(input: {
  user: Pick<AuthUser, "role" | "id">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): SettlementWalletPaymentAuthResult {
  const role = input.proContext?.role?.trim() ?? "";
  if (role === "ORG_OWNER" && input.user.role === "PRO") {
    return { allowed: true, branchIds: [] };
  }

  if (!isOrgWorkplaceMemberRole(role) || !input.proContext?.organization?.id) {
    return { allowed: false, reason: "raw_pro_gate" };
  }

  if (!input.contextReady || validateProContextSnapshot(input.proContext).ok !== true) {
    return { allowed: false, reason: "missing_context" };
  }

  const grants = activeBranchPermissionGrants(input.proContext);
  if (grants.length === 0) {
    return { allowed: false, reason: "no_active_branch_grant" };
  }

  const payoutBranchIds = [
    ...new Set([
      ...branchIdsWithPermission(grants, "canPayBonusCash"),
      ...branchIdsWithPermission(grants, "canPayBonusTransfer"),
    ]),
  ];
  if (payoutBranchIds.length === 0) {
    return { allowed: false, reason: "missing_wallet_permission" };
  }
  return { allowed: true, branchIds: payoutBranchIds };
}

export function settlementWalletAccessDeniedCopy(
  reason: SettlementWalletReadDenyReason,
): string {
  switch (reason) {
    case "missing_wallet_permission":
      return "Нет права «Просмотр расчётов». Обратитесь к руководителю организации.";
    case "no_active_branch_grant":
      return "Нет активного назначения на филиал для просмотра расчётов организации.";
    case "foreign_or_revoked_membership":
      return "Доступ к расчётам организации недоступен для этого членства.";
    case "suspended":
      return "Доступ к кабинету организации приостановлен.";
    case "missing_context":
    case "invalid_context":
      return "Не удалось подтвердить контекст организации. Обновите страницу или обратитесь в поддержку.";
    case "raw_pro_gate":
    case "not_org_workplace":
      return "Раздел недоступен для этого профиля.";
    default:
      return "Раздел недоступен для этого профиля.";
  }
}
