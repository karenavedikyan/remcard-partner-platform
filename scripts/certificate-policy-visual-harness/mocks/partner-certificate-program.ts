import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";

export async function fetchPartnerCertificateProgram(): Promise<PartnerCertProgramState> {
  return {
    status: "loaded",
    items: [
      { category: "doors", categoryLabel: "Двери", poolPercent: 15 },
      { category: "floor", categoryLabel: "Напольные покрытия", poolPercent: 12.5 },
    ],
    policy: {
      validityDays: 30,
      purchaseLimit: 2,
      minimumPurchaseAmount: null,
      promotionsCompatible: false,
      exclusionsText: null,
    },
  };
}