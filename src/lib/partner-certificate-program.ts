import { remcardFetch } from "@/lib/api-client";

export type PartnerCertProgramItem = {
  category: string;
  categoryLabel: string;
  poolPercent: number;
};

/** Public general certificate policy numbers (catalog only — never individual/pending). */
export type PartnerCertProgramPolicy = {
  validityDays: number;
  purchaseLimit: number;
  minimumPurchaseAmount: number | null;
  promotionsCompatible: boolean;
  exclusionsText: string | null;
};

export type PartnerCertProgramState =
  | { status: "loading" }
  | {
      status: "loaded";
      items: PartnerCertProgramItem[];
      truncated?: boolean;
      policy?: PartnerCertProgramPolicy | null;
    }
  | { status: "empty" }
  | { status: "error"; message: string };

export async function fetchPartnerCertificateProgram(
  partnerUserId: string,
): Promise<PartnerCertProgramState> {
  try {
    const data = await remcardFetch<{
      items?: PartnerCertProgramItem[];
      truncated?: boolean;
      totalPublished?: number;
      policy?: PartnerCertProgramPolicy | null;
    }>(`/api/partner/${encodeURIComponent(partnerUserId)}/certificate-program-summary`);
    const items = data.items ?? [];
    const policy = data.policy ?? null;
    if (!items.length && !policy) {
      return { status: "empty" };
    }
    return {
      status: "loaded",
      items,
      truncated: data.truncated,
      policy,
    };
  } catch (caught) {
    return {
      status: "error",
      message: caught instanceof Error ? caught.message : "Не удалось загрузить условия",
    };
  }
}
