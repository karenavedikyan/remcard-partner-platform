import type { PartnerTaxonomyResponse } from "@/lib/types";

/** Mirrors prototype showcaseResults heading: direction label, else stage label, else default. */
export function findShowcaseHeadingTitle(input: {
  stageId: string;
  specialization: string;
  taxonomy: PartnerTaxonomyResponse | null;
}): string {
  const { stageId, specialization, taxonomy } = input;
  if (!taxonomy) {
    return "Найдите своего партнёра";
  }

  if (specialization) {
    const [group, rawId] = specialization.split(":");
    const id = rawId?.trim() ?? "";
    if (group === "products" || group === "services") {
      const list = group === "products" ? taxonomy.products : taxonomy.services;
      const hit = list.find((item) => item.id === id);
      if (hit?.label?.trim()) {
        return hit.label.trim();
      }
    }
  }

  if (stageId) {
    const stage = taxonomy.stages.find((item) => item.id === stageId);
    if (stage?.label?.trim()) {
      return stage.label.trim();
    }
  }

  return "Найдите своего партнёра";
}

export function countOpenToCooperatePartners(partners: { partnershipStatus?: string | null }[]): number {
  return partners.filter((partner) => {
    const status = partner.partnershipStatus?.trim() ?? "";
    return !status || status === "ENDED";
  }).length;
}
