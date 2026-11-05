import { isOrgWorkplaceMemberRole } from "@/lib/cabinet-presentation/resolve";
import { validateProContextSnapshot } from "@/lib/cabinet-presentation/validate";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";

export type SettlementWalletReadDenyReason =
  | "raw_pro_gate"
  | "missing_context"
  | "invalid_context"
  | "suspended"
  | "missing_wallet_permission"
  | "not_org_workplace";

export type SettlementWalletReadAuthResult =
  | { allowed: true; mode: "pro-owner" | "pro-solo" | "org-member-with-ledger" }
  | { allowed: false; reason: SettlementWalletReadDenyReason };

/**
 * Mirror of navigator authorizeSettlementWalletRead — no upfront user.role !== PRO gate.
 */
export function authorizeSettlementWalletRead(input: {
  user: Pick<AuthUser, "role">;
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
    const canViewWallet = proContext.effectivePermissions?.canViewWallet === true;
    if (!canViewWallet) {
      return { allowed: false, reason: "missing_wallet_permission" };
    }
    return { allowed: true, mode: "org-member-with-ledger" };
  }

  if (input.user.role !== "PRO") {
    return { allowed: false, reason: "raw_pro_gate" };
  }

  return { allowed: true, mode: role === "ORG_OWNER" ? "pro-owner" : "pro-solo" };
}

export function settlementWalletAccessDeniedCopy(
  reason: SettlementWalletReadDenyReason,
): string {
  switch (reason) {
    case "missing_wallet_permission":
      return "Нет права «Просмотр расчётов». Обратитесь к руководителю организации.";
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
