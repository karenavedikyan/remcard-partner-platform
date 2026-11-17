import type { TeamMemberRow } from "./employees-overview-types";
import {
  actionIdsFromFlags,
  flagsEqual,
  normalizePermissionFlags,
  type ProfIActionId,
  type ProfIPermissionFlags,
} from "./prof-i-permissions";

export function flagsFromBranchAccess(
  access: TeamMemberRow["branchAccess"][number],
): ProfIPermissionFlags {
  return normalizePermissionFlags(access.permissions as Partial<ProfIPermissionFlags>);
}

export function memberPermissionState(member: TeamMemberRow): {
  defaultPermissions: ProfIPermissionFlags;
  branchPermissions: Record<string, ProfIPermissionFlags>;
  permissionsMixed: boolean;
  selectedBranchIds: string[];
} {
  const selectedBranchIds = member.branchAccess.map((b) => b.branchId);
  const branchPermissions: Record<string, ProfIPermissionFlags> = {};
  for (const access of member.branchAccess) {
    branchPermissions[access.branchId] = flagsFromBranchAccess(access);
  }
  const flagList = Object.values(branchPermissions);
  const defaultPermissions = flagList[0] ?? normalizePermissionFlags({});
  const permissionsMixed =
    flagList.length > 1 && flagList.some((f) => !flagsEqual(f, defaultPermissions));
  return {
    defaultPermissions,
    branchPermissions,
    permissionsMixed,
    selectedBranchIds,
  };
}

export function effectiveActionIdsForBranch(input: {
  permissionsMixed: boolean;
  defaultPermissions: ProfIPermissionFlags;
  branchPermissions: Record<string, ProfIPermissionFlags>;
  branchId: string;
}): ProfIActionId[] {
  if (input.permissionsMixed && input.branchPermissions[input.branchId]) {
    return actionIdsFromFlags(input.branchPermissions[input.branchId]!);
  }
  return actionIdsFromFlags(input.defaultPermissions);
}

export type HeadOfficeRightsMap = Record<
  string,
  { role: string | null; permissions: Record<string, boolean> | null }
>;

/**
 * Saved rights of a member without Branch, exactly as the server returned them (`headOfficeRights`).
 * `null` = never saved / revoked / role changed: no rights (fail-closed), nothing is derived from the position.
 */
export function savedHeadOfficeFlags(
  member: TeamMemberRow,
  headOfficeRights?: HeadOfficeRightsMap,
): ProfIPermissionFlags | null {
  if (member.branchAccess.length > 0) return null;
  const saved = headOfficeRights?.[member.userId]?.permissions;
  if (!saved) return null;
  return normalizePermissionFlags(saved as Partial<ProfIPermissionFlags>);
}

export function summarizeMemberAccess(
  member: TeamMemberRow,
  headOfficeRights?: HeadOfficeRightsMap,
): {
  mixed: boolean;
  actionCount: number;
  hasPayout: boolean;
  subtitle: string;
} {
  const { permissionsMixed, defaultPermissions, branchPermissions } = memberPermissionState(member);
  const allIds = new Set<ProfIActionId>();
  const officeFlags = savedHeadOfficeFlags(member, headOfficeRights);
  if (officeFlags) {
    for (const id of actionIdsFromFlags(officeFlags)) allIds.add(id);
  }
  for (const access of member.branchAccess) {
    for (const id of effectiveActionIdsForBranch({
      permissionsMixed,
      defaultPermissions,
      branchPermissions,
      branchId: access.branchId,
    })) {
      allIds.add(id);
    }
  }
  const hasPayout = allIds.has("cash") || allIds.has("transfer");
  const actionCount = allIds.size;
  let subtitle = permissionsMixed
    ? "Разные права по подразделениям"
    : `${actionCount} разрешений`;
  if (hasPayout) subtitle += " · выплаты разрешены";
  else if (allIds.has("sale")) subtitle += " · продажа и начисление";
  return { mixed: permissionsMixed, actionCount, hasPayout, subtitle };
}
