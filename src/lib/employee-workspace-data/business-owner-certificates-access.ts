import { isOrgWorkplaceMemberRole } from "@/lib/cabinet-presentation/resolve";
import { validateProContextSnapshot } from "@/lib/cabinet-presentation/validate";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import {
  activeBranchPermissionGrants,
  branchIdsWithPermission,
} from "./branch-assignment-auth";

export type BusinessOwnerCertificatesDenyReason =
  | "owner_context_required"
  | "missing_context"
  | "invalid_context"
  | "suspended"
  | "no_active_branch_grant"
  | "missing_certificates_permission"
  | "owner_only_policy"
  | "raw_pro_gate";

export type BusinessOwnerCertificatesListReadAuth =
  | { allowed: true; mode: "pro-owner" | "org-branch-scoped"; branchIds?: string[] }
  | { allowed: false; reason: BusinessOwnerCertificatesDenyReason };

export type BusinessOwnerCertificatesMutationAuth =
  | { allowed: true; branchIds: string[] }
  | { allowed: false; reason: BusinessOwnerCertificatesDenyReason };

/**
 * GET /api/pro/business-owner-certificates read — separate from mutation context helper.
 */
export function authorizeBusinessOwnerCertificatesListRead(input: {
  user: Pick<AuthUser, "role">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): BusinessOwnerCertificatesListReadAuth {
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

    const certBranches = branchIdsWithPermission(grants, "canManageCertificates");
    if (certBranches.length === 0) {
      return { allowed: false, reason: "missing_certificates_permission" };
    }

    return { allowed: true, mode: "org-branch-scoped", branchIds: certBranches };
  }

  if (input.user.role === "PRO") {
    return { allowed: true, mode: "pro-owner" };
  }

  return { allowed: false, reason: "raw_pro_gate" };
}

/** POST/PATCH/DELETE — employees stay denied unless explicit canManageCertificates (owner-only tests). */
export function authorizeBusinessOwnerCertificatesMutation(input: {
  user: Pick<AuthUser, "role">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): BusinessOwnerCertificatesMutationAuth {
  const role = input.proContext?.role?.trim() ?? "";
  if (role === "ORG_OWNER" && input.user.role === "PRO") {
    return { allowed: true, branchIds: [] };
  }

  const read = authorizeBusinessOwnerCertificatesListRead(input);
  if (!read.allowed || read.mode !== "org-branch-scoped" || !read.branchIds?.length) {
    return { allowed: false, reason: read.allowed ? "owner_only_policy" : read.reason };
  }

  return { allowed: true, branchIds: read.branchIds };
}

export function businessOwnerCertificatesAccessDeniedCopy(
  reason: BusinessOwnerCertificatesDenyReason,
): string {
  switch (reason) {
    case "missing_certificates_permission":
      return "Нет права на сертификаты организации. Обратитесь к руководителю.";
    case "no_active_branch_grant":
      return "Нет активного назначения на филиал для раздела «Сертификаты».";
    case "owner_only_policy":
      return "Выпуск и изменение сертификатов доступны владельцу или с правом «Сканирование сертификатов».";
    case "suspended":
      return "Доступ к кабинету организации приостановлен.";
    default:
      return "Раздел «Сертификаты» недоступен для текущего профиля.";
  }
}
