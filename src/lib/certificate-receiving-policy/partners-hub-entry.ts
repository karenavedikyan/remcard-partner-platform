import type { OrganizationPartnershipReadContext } from "@/lib/employee-workspace-data/organization-partnership-read";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";
import {
  certificateTermsReadableForPartnersList,
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

/** Whether the partners list may load the viewer's terms for per-row restrictions (same trust rules as the entry). */
export function partnersHubCertificateTermsReadable(input: {
  proContextReady: boolean;
  proContext: ProContextSnapshot | null;
  profile: ProProfileResponse;
  organizationReadContext?: OrganizationPartnershipReadContext | null;
}): boolean {
  if (!input.proContextReady || !input.proContext?.role) {
    return false;
  }
  return certificateTermsReadableForPartnersList({
    profile: input.profile,
    proContext: input.proContext,
    isOrgStaffWorkplaceUi: Boolean(input.organizationReadContext?.readOnlyActor),
  });
}
