import type {
  BranchAssignmentSnapshot,
  ProContextSnapshot,
} from "@/lib/profile-cabinet-access";
import type { ProfIPermissionFlags } from "@/lib/prof-i-permissions";

/** Trusted ACTIVE branch rows only — never treat missing rows as implicit allow (bb7db4ca count===0 bug). */
export function activeBranchPermissionGrants(
  proContext: ProContextSnapshot | null | undefined,
): BranchAssignmentSnapshot[] {
  if (!proContext) return [];
  const listed = proContext.branchAssignments?.filter((row) => row.status === "ACTIVE") ?? [];
  if (listed.length > 0) return listed;

  const branchId = proContext.activeBranch?.id?.trim();
  const permissions = proContext.effectivePermissions;
  if (branchId && permissions) {
    return [{ branchId, status: "ACTIVE", effectivePermissions: permissions }];
  }
  return [];
}

export function branchIdsWithPermission(
  grants: BranchAssignmentSnapshot[],
  flag: keyof ProfIPermissionFlags,
): string[] {
  const ids: string[] = [];
  for (const grant of grants) {
    if (grant.effectivePermissions?.[flag] === true) {
      ids.push(grant.branchId);
    }
  }
  return ids;
}
