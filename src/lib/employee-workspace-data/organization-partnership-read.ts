import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { ProfIPermissionFlags } from "@/lib/prof-i-permissions";
import type { PartnerSideProfile } from "@/lib/partnership-rules";
import { isOrgWorkplaceMemberRole } from "@/lib/cabinet-presentation/resolve";
import { validateProContextSnapshot } from "@/lib/cabinet-presentation/validate";

/** Trusted org business subject for GET /api/partnership/list read (actor stays session user). */
export type OrganizationPartnershipReadContext = {
  organizationId: string;
  organizationName: string;
  partnerType: "STORE" | "COMPANY";
  /** Organization owner's PRO user id from trusted GET /api/pro/context (never from query/body). */
  principalProUserId: string;
  /** Canonical trade directions from trusted org record in GET /api/pro/context. */
  storeCategories: string[];
  specializations: string[];
  effectivePermissions?: ProfIPermissionFlags;
  /** True when the signed-in user is not the org owner principal. */
  readOnlyActor: boolean;
};

export function organizationPartnershipReadContextFromProContext(input: {
  proContext: ProContextSnapshot | null;
  contextReady: boolean;
  actorUserId: string;
}): OrganizationPartnershipReadContext | null {
  if (!input.contextReady || !input.proContext) return null;
  if (validateProContextSnapshot(input.proContext).ok !== true) return null;
  const role = input.proContext.role?.trim() ?? "";
  if (!isOrgWorkplaceMemberRole(role)) return null;

  const org = input.proContext.organization;
  const organizationId = org?.id?.trim();
  const organizationName = org?.name?.trim();
  const ownerId = org?.ownerId?.trim();
  const partnerType = org?.partnerType;
  if (!organizationId || !organizationName || !ownerId) return null;
  if (partnerType !== "STORE" && partnerType !== "COMPANY") return null;

  // Canonical trade directions: organization record on GET /api/pro/context only.
  // Never derive from branch.storeCategories or client-supplied ids.
  const orgCategories = org?.storeCategories;
  const orgSpecs = org?.specializations;

  return {
    organizationId,
    organizationName,
    partnerType,
    principalProUserId: ownerId,
    storeCategories: Array.isArray(orgCategories) ? [...orgCategories] : [],
    specializations: Array.isArray(orgSpecs) ? [...orgSpecs] : [],
    effectivePermissions: input.proContext.effectivePermissions,
    readOnlyActor: ownerId !== input.actorUserId.trim(),
  };
}

export function partnerSideFromOrganizationReadContext(
  ctx: OrganizationPartnershipReadContext,
): PartnerSideProfile {
  return {
    id: ctx.principalProUserId,
    partnerType: ctx.partnerType,
    partnerActivities: ctx.partnerType === "STORE" ? ["STORE"] : ["COMPANY"],
    storeCategories: ctx.storeCategories,
    specializations: ctx.specializations,
    isStoreOwner: ctx.partnerType === "STORE",
    organizationName: ctx.organizationName,
  };
}

/** Id used for counterparty/terms/list filters — org principal for workplace read, else actor. */
export function resolvePartnershipListPrincipalUserId(input: {
  actorUserId: string;
  organizationReadContext?: OrganizationPartnershipReadContext | null;
}): string {
  const principal = input.organizationReadContext?.principalProUserId?.trim();
  return principal || input.actorUserId;
}

export function orgStaffCanMutatePartnerships(
  organizationReadContext?: OrganizationPartnershipReadContext | null,
): boolean {
  if (!organizationReadContext?.readOnlyActor) return true;
  return Boolean(organizationReadContext.effectivePermissions?.canManagePartnerships);
}

export function filterPartnershipUiActionsForOrgRead<T extends { kind: string }>(
  actions: T[],
  organizationReadContext?: OrganizationPartnershipReadContext | null,
): T[] {
  if (orgStaffCanMutatePartnerships(organizationReadContext)) return actions;
  return actions.filter((action) => action.kind === "waiting");
}
