import { remcardFetch } from "@/lib/api-client";

export type PartnerCertProgramItem = {
  category: string;
  categoryLabel: string;
  poolPercent: number;
};

export type PartnerCertProgramState =
  | { status: "loading" }
  | { status: "loaded"; items: PartnerCertProgramItem[]; truncated?: boolean }
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
    }>(`/api/partner/${encodeURIComponent(partnerUserId)}/certificate-program-summary`);
    const items = data.items ?? [];
    if (!items.length) {
      return { status: "empty" };
    }
    return { status: "loaded", items, truncated: data.truncated };
  } catch (caught) {
    return {
      status: "error",
      message: caught instanceof Error ? caught.message : "Не удалось загрузить условия",
    };
  }
}
