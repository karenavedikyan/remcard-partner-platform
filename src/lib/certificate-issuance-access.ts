import { activeBranchPermissionGrants, branchIdsWithPermission } from "@/lib/employee-workspace-data/branch-assignment-auth";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";

const BRANCH_STAFF_ROLES = new Set(["BRANCH_MANAGER", "BRANCH_EMPLOYEE"]);

export function isBranchStaffContext(proContext: ProContextSnapshot | null | undefined): boolean {
  const role = proContext?.role?.trim();
  return Boolean(role && BRANCH_STAFF_ROLES.has(role));
}

/** Branch ids where the signed-in employee may issue certificates (empty for non-staff contexts). */
export function certificateIssuerBranchIds(proContext: ProContextSnapshot | null | undefined): string[] {
  if (!proContext) return [];
  return branchIdsWithPermission(activeBranchPermissionGrants(proContext), "canManageCertificates");
}

export type StaffCertificateBranch = { id: string; name: string; city: string; address?: string | null };

/** The employee's own branches where he manages certificates (same set the server accepts as `?branchId`). */
export function certificateStaffBranches(
  proContext: ProContextSnapshot | null | undefined,
): StaffCertificateBranch[] {
  if (!isBranchStaffContext(proContext)) return [];
  const allowed = new Set(certificateIssuerBranchIds(proContext));
  return (proContext?.branches ?? []).filter((b) => allowed.has(b.id));
}

/**
 * Whether the certificate issue UI is offered. Owners and specialists are unchanged (always true);
 * branch employees need `canManageCertificates` on at least one active branch and must not be VIEWER.
 * The server enforces the same rule — this only avoids showing controls that would answer 403.
 */
export function canIssueCertificates(proContext: ProContextSnapshot | null | undefined): boolean {
  if (!isBranchStaffContext(proContext)) return true;
  if (proContext?.branchRole?.trim().toUpperCase() === "VIEWER") return false;
  return certificateIssuerBranchIds(proContext).length > 0;
}

/** «Выпустил: Имя» for the list, card and detail; null when the issuer is unknown (legacy rows). */
export function certificateIssuedByLabel(
  cert: { issuedBy?: { name?: string | null } | null } | null | undefined,
): string | null {
  const name = cert?.issuedBy?.name?.trim();
  return name ? `Выпустил: ${name}` : null;
}
