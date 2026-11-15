import type { OrganizationPartnershipReadContext } from "@/lib/employee-workspace-data/organization-partnership-read";
import { isOrganizationStaffEmployee } from "@/lib/profile-staff-cabinet";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import { isAgentCooperationInviter } from "@/lib/partnership-agent-inviter";
import type { ProProfileResponse, User } from "@/lib/types";

const DELEGATED_PRO_CONTEXT_ROLES = new Set([
  "ORG_EMPLOYEE",
  "ORG_TEAM_MEMBER",
  "BRANCH_MANAGER",
  "BRANCH_EMPLOYEE",
  "PARTNER_MANAGER",
  "PARTNER_EMPLOYEE",
  "PARTNER_EMPLOYEE_SUSPENDED",
]);

export type CertificateReceivingPolicyUiGate = {
  showEntry: boolean;
  canEditSettings: boolean;
};

export type CertificateReceivingPolicyApiGate =
  | { ok: true; ownerUserId: string; canMutateSettings: boolean; canReadWorkspace: boolean }
  | { ok: false; status: number; message: string };

type UserGateSlice = Pick<
  User,
  "id" | "role" | "partnerType" | "partnerActivities" | "isBlocked"
>;

/** Owner principal: SOLO_PARTNER or ORG_OWNER with trusted organization (not resolveUserOrganization). */
export function isCertificateReceivingPolicyOwnerContext(
  proContext: ProContextSnapshot | null | undefined,
): boolean {
  if (!proContext) return false;
  if (proContext.role === "SOLO_PARTNER") return true;
  if (proContext.role === "ORG_OWNER" && proContext.organization?.id) return true;
  return false;
}

export function isCertificateReceivingPolicyDelegatedContext(
  proContext: ProContextSnapshot | null | undefined,
): boolean {
  if (!proContext?.role) return false;
  return DELEGATED_PRO_CONTEXT_ROLES.has(proContext.role);
}

function businessReceivingPartnerType(user: Pick<User, "partnerType">): boolean {
  const pt = user.partnerType;
  return pt === "STORE" || pt === "COMPANY" || pt === "MASTER";
}

function userEligibleForReceivingProgram(user: UserGateSlice, proContext: ProContextSnapshot): boolean {
  if (user.role !== "PRO") return false;
  if (isCertificateReceivingPolicyDelegatedContext(proContext)) return false;
  if (!isCertificateReceivingPolicyOwnerContext(proContext)) return false;
  if (proContext.role === "ORG_OWNER") return true;
  if (businessReceivingPartnerType(user)) return true;
  return isAgentCooperationInviter(user);
}

/** Receiving settings (PATCH / profile «Настроить») — business owners only, never pure/agency agent. */
export function certificateReceivingPolicyCanMutateSettings(
  user: UserGateSlice,
  proContext: ProContextSnapshot | null | undefined,
): boolean {
  if (!proContext || !userEligibleForReceivingProgram(user, proContext)) return false;
  if (isAgentCooperationInviter(user)) return false;
  if (proContext.role === "ORG_OWNER") return true;
  return businessReceivingPartnerType(user);
}

export function resolveCertificateReceivingPolicyUiGate(input: {
  profile: ProProfileResponse;
  proContext: ProContextSnapshot | null;
  isOrgStaffWorkplaceUi: boolean;
}): CertificateReceivingPolicyUiGate {
  if (input.isOrgStaffWorkplaceUi) {
    return { showEntry: false, canEditSettings: false };
  }
  if (isOrganizationStaffEmployee(input.profile, input.proContext)) {
    return { showEntry: false, canEditSettings: false };
  }
  if (isCertificateReceivingPolicyDelegatedContext(input.proContext)) {
    return { showEntry: false, canEditSettings: false };
  }
  if (!userEligibleForReceivingProgram(input.profile.user, input.proContext ?? { role: "" })) {
    return { showEntry: false, canEditSettings: false };
  }
  const canEditSettings = certificateReceivingPolicyCanMutateSettings(
    input.profile.user,
    input.proContext,
  );
  return { showEntry: true, canEditSettings };
}

export function assertCertificateReceivingPolicyApiAccess(input: {
  user: UserGateSlice;
  proContext: ProContextSnapshot;
  method: "GET" | "PATCH";
}): CertificateReceivingPolicyApiGate {
  if (isCertificateReceivingPolicyDelegatedContext(input.proContext)) {
    return { ok: false, status: 403, message: "Нет доступа" };
  }
  if (!isCertificateReceivingPolicyOwnerContext(input.proContext)) {
    return { ok: false, status: 403, message: "Нет доступа" };
  }
  if (!userEligibleForReceivingProgram(input.user, input.proContext)) {
    return { ok: false, status: 403, message: "Нет доступа" };
  }
  const canMutate = certificateReceivingPolicyCanMutateSettings(input.user, input.proContext);
  if (input.method === "PATCH" && !canMutate) {
    return { ok: false, status: 403, message: "Недостаточно прав для изменения условий" };
  }
  return {
    ok: true,
    ownerUserId: input.user.id,
    canMutateSettings: canMutate,
    canReadWorkspace: true,
  };
}

/** Hub list tab: minimal trusted pro-context when full snapshot is unavailable client-side. */
export function proContextSnapshotForPartnersHubGate(input: {
  meProfile: ProProfileResponse;
  organizationReadContext?: OrganizationPartnershipReadContext | null;
}): ProContextSnapshot {
  if (input.organizationReadContext?.readOnlyActor) {
    return {
      role: "ORG_TEAM_MEMBER",
      organization: {
        id: input.organizationReadContext.organizationId,
        name: input.organizationReadContext.organizationName,
        partnerType: input.organizationReadContext.partnerType,
      },
    };
  }
  const org = input.meProfile.organization;
  if (org?.id) {
    const pt = input.meProfile.user.partnerType;
    return {
      role: "ORG_OWNER",
      organization: {
        id: org.id,
        name: org.name,
        ...(pt === "STORE" || pt === "COMPANY" ? { partnerType: pt } : {}),
      },
    };
  }
  return { role: "SOLO_PARTNER", organization: null };
}