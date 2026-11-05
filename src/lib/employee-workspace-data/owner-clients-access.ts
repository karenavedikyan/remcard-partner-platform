import { isOrgWorkplaceMemberRole } from "@/lib/cabinet-presentation/resolve";
import { validateProContextSnapshot } from "@/lib/cabinet-presentation/validate";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import {
  activeBranchPermissionGrants,
  branchIdsWithPermission,
} from "./branch-assignment-auth";

export type OwnerClientsAccessDenyReason =
  | "owner_context_required"
  | "missing_context"
  | "invalid_context"
  | "suspended"
  | "no_active_branch_grant"
  | "missing_leads_permission"
  | "own_operations_only"
  | "raw_pro_gate";

export type OwnerClientsListReadAuth =
  | { allowed: true; mode: "pro-owner" | "pro-solo" | "org-branch-scoped"; branchIds?: string[] }
  | { allowed: false; reason: OwnerClientsAccessDenyReason };

export type OwnerClientsMutationAuth =
  | { allowed: true; branchIds: string[] }
  | { allowed: false; reason: OwnerClientsAccessDenyReason };

/**
 * GET /api/pro/agent-clients read — separate from requireOwnerClientsContext mutations.
 * canViewOwnOperations alone does NOT grant organization CRM list read.
 */
export function authorizeOwnerClientsListRead(input: {
  user: Pick<AuthUser, "role">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): OwnerClientsListReadAuth {
  if (input.proContext?.role === "PARTNER_EMPLOYEE_SUSPENDED") {
    return { allowed: false, reason: "suspended" };
  }

  const role = input.proContext?.role?.trim() ?? "";
  const proContext = input.proContext;
  const validation = validateProContextSnapshot(proContext);

  if (isOrgWorkplaceMemberRole(role) && proContext?.organization?.id) {
    if (!input.contextReady || validation.ok !== true) {
      return { allowed: false, reason: "missing_context" };
    }
    if (role === "ORG_OWNER" && input.user.role === "PRO") {
      return { allowed: true, mode: "pro-owner" };
    }

    const grants = activeBranchPermissionGrants(proContext);
    if (grants.length === 0) {
      return { allowed: false, reason: "no_active_branch_grant" };
    }

    const leadsBranches = branchIdsWithPermission(grants, "canManageLeads");
    if (leadsBranches.length === 0) {
      if (proContext.effectivePermissions?.canViewOwnOperations) {
        return { allowed: false, reason: "own_operations_only" };
      }
      return { allowed: false, reason: "missing_leads_permission" };
    }

    return { allowed: true, mode: "org-branch-scoped", branchIds: leadsBranches };
  }

  if (input.user.role === "PRO") {
    return { allowed: true, mode: "pro-solo" };
  }

  return { allowed: false, reason: "raw_pro_gate" };
}

/** POST/PATCH/DELETE — keep owner-only default; employee needs explicit canManageLeads on ACTIVE branch. */
export function authorizeOwnerClientsMutation(input: {
  user: Pick<AuthUser, "role">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): OwnerClientsMutationAuth {
  const read = authorizeOwnerClientsListRead(input);
  if (!read.allowed) {
    return { allowed: false, reason: read.reason };
  }
  if (read.mode === "pro-owner" || read.mode === "pro-solo") {
    return { allowed: true, branchIds: read.branchIds ?? [] };
  }
  if (read.mode === "org-branch-scoped" && read.branchIds?.length) {
    return { allowed: true, branchIds: read.branchIds };
  }
  return { allowed: false, reason: "owner_context_required" };
}

export function ownerClientsAccessDeniedCopy(reason: OwnerClientsAccessDenyReason): string {
  switch (reason) {
    case "missing_leads_permission":
      return "Нет права на работу с клиентами организации. Обратитесь к руководителю.";
    case "own_operations_only":
      return "Доступны только ваши операции — полный список клиентов организации не выдан.";
    case "no_active_branch_grant":
      return "Нет активного назначения на филиал для раздела «Клиенты».";
    case "owner_context_required":
      return "Изменение клиентской базы доступно владельцу или с правом «Клиенты и рекомендации».";
    case "suspended":
      return "Доступ к кабинету организации приостановлен.";
    case "missing_context":
    case "invalid_context":
      return "Не удалось подтвердить контекст организации.";
    default:
      return "Раздел «Клиенты» недоступен для текущего профиля.";
  }
}
