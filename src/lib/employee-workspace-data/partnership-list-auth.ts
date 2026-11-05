import {
  isOrgWorkplaceMemberRole,
  isKnownProContextRole,
} from "@/lib/cabinet-presentation/resolve";
import { validateProContextSnapshot } from "@/lib/cabinet-presentation/validate";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import {
  organizationPartnershipReadContextFromProContext,
  type OrganizationPartnershipReadContext,
} from "./organization-partnership-read";

export type PartnershipListAuthDenyReason =
  | "pro_gate"
  | "missing_context"
  | "invalid_context"
  | "suspended"
  | "not_org_member";

export type PartnershipListAuthResult =
  | { allowed: true; mode: "personal-pro"; principalUserId: string }
  | { allowed: true; mode: "organization"; readContext: OrganizationPartnershipReadContext }
  | { allowed: false; reason: PartnershipListAuthDenyReason };

/**
 * Client mirror of navigator GET /api/partnership/list authorization (base bb7db4ca fix).
 * PRO solo / personal list unchanged; org workplace members read organization scope.
 */
export function authorizePartnershipListRead(input: {
  user: Pick<AuthUser, "id" | "role">;
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
}): PartnershipListAuthResult {
  const validation = validateProContextSnapshot(input.proContext);
  if (input.proContext?.role === "PARTNER_EMPLOYEE_SUSPENDED") {
    return { allowed: false, reason: "suspended" };
  }

  const orgRead = organizationPartnershipReadContextFromProContext({
    proContext: input.proContext,
    contextReady: input.contextReady,
    actorUserId: input.user.id,
  });
  if (orgRead) {
    return { allowed: true, mode: "organization", readContext: orgRead };
  }

  if (input.user.role === "PRO") {
    const role = input.proContext?.role?.trim() ?? "";
    if (input.contextReady && role && isKnownProContextRole(role) && isOrgWorkplaceMemberRole(role)) {
      if (validation.ok !== true) return { allowed: false, reason: "invalid_context" };
      return { allowed: false, reason: "missing_context" };
    }
    return { allowed: true, mode: "personal-pro", principalUserId: input.user.id };
  }

  if (input.contextReady && validation.ok !== true) {
    return { allowed: false, reason: "invalid_context" };
  }
  return { allowed: false, reason: "pro_gate" };
}
