import type { CertificatePolicyPublicSummary } from "./types";
import type { PartnerCertProgramPolicy } from "@/lib/partner-certificate-program";

/** Map public program API policy to UI summary (general only — never individual). */
export function certificatePolicyPublicSummaryFromProgram(
  policy: PartnerCertProgramPolicy,
): CertificatePolicyPublicSummary {
  return {
    validityDays: policy.validityDays,
    purchaseLimit: policy.purchaseLimit,
    minimumPurchaseAmount: policy.minimumPurchaseAmount,
    promotionsCompatible: policy.promotionsCompatible,
    exclusionsText: policy.exclusionsText,
    items: [],
  };
}