import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import {
  activeBranchPermissionGrants,
  branchIdsWithPermission,
} from "./branch-assignment-auth";

/**
 * Mirror of navigator resolveSettlementSubjects — org workplace must not mix
 * actor personal wallet ids with organization ledger subjects or all branches.
 */
export type SettlementWalletSubjectScope = {
  organizationId: string;
  /** Branches where canViewWallet is granted (ACTIVE assignments only). */
  branchIds: string[];
  /** Org owner PRO user id — ledger principal, not session actor. */
  organizationPrincipalUserId: string;
  /** Session actor — audit/mutations only; excluded from org ledger subject set. */
  actorUserId: string;
};

export function resolveOrganizationSettlementWalletSubjects(input: {
  proContext: ProContextSnapshot;
  actorUserId: string;
}): SettlementWalletSubjectScope | null {
  const orgId = input.proContext.organization?.id?.trim();
  const ownerId = input.proContext.organization?.ownerId?.trim();
  if (!orgId || !ownerId) return null;

  const grants = activeBranchPermissionGrants(input.proContext);
  const branchIds = branchIdsWithPermission(grants, "canViewWallet");
  if (branchIds.length === 0) return null;

  return {
    organizationId: orgId,
    branchIds,
    organizationPrincipalUserId: ownerId,
    actorUserId: input.actorUserId.trim(),
  };
}
