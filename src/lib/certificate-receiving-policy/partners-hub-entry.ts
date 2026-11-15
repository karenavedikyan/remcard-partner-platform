import type { OrganizationPartnershipReadContext } from "@/lib/employee-workspace-data/organization-partnership-read";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";
import {
  resolveCertificateReceivingPolicyUiGate,
  type CertificateReceivingPolicyUiGate,
} from "./access";

/**
 * Partners hub certificate-policy chip — requires trusted GET /api/pro/context.
 * Never infer owner/solo from profile.organization.
 */
export function partnersHubCertificatePolicyEntry(input: {
  proContextReady: boolean;
  proContext: ProContextSnapshot | null;
  profile: ProProfileResponse;
  organizationReadContext?: OrganizationPartnershipReadContext | null;
}): CertificateReceivingPolicyUiGate | null {
  if (!input.proContextReady || !input.proContext?.role) {
    return null;
  }
  return resolveCertificateReceivingPolicyUiGate({
    profile: input.profile,
    proContext: input.proContext,
    isOrgStaffWorkplaceUi: Boolean(input.organizationReadContext?.readOnlyActor),
  });
}