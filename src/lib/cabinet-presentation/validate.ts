import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import { isKnownProContextRole, isOrgWorkplaceMemberRole } from "./resolve";

export type ProContextValidation =
  | { ok: true }
  | { ok: false; reason: "missing_role" | "unknown_role" | "suspended" | "malformed_org" };

export function validateProContextSnapshot(
  proContext: ProContextSnapshot | null | undefined,
): ProContextValidation {
  if (!proContext) return { ok: false, reason: "missing_role" };
  const role = proContext.role?.trim();
  if (!role) return { ok: false, reason: "missing_role" };
  if (role === "PARTNER_EMPLOYEE_SUSPENDED") return { ok: false, reason: "suspended" };
  if (!isKnownProContextRole(role)) return { ok: false, reason: "unknown_role" };
  if (isOrgWorkplaceMemberRole(role)) {
    const orgId = proContext.organization?.id?.trim();
    const orgName = proContext.organization?.name?.trim();
    if (!orgId || !orgName) return { ok: false, reason: "malformed_org" };
  }
  return { ok: true };
}
