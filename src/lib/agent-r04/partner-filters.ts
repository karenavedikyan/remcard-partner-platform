import type { Partnership, PartnershipUser } from "@/lib/types";

export type AgentPartnerTypeFilter = "" | "agent" | "specialist" | "store" | "company";

export type PartnershipPartnerProfile = PartnershipUser & {
  partnerActivities?: string[];
  workingProductCategoryIds?: string[];
  workingServiceSpecializationIds?: string[];
  workingNavigatorStageIds?: string[];
};

export function partnershipPartnerUser(partnership: Partnership, meId: string): PartnershipPartnerProfile {
  return (partnership.storeUserId === meId ? partnership.proUser : partnership.storeUser) as PartnershipPartnerProfile;
}

export function resolvePublicPartnerType(user: PartnershipPartnerProfile): AgentPartnerTypeFilter {
  if ((user.partnerActivities ?? []).includes("AGENT")) return "agent";
  if (user.partnerType === "STORE") return "store";
  if (user.partnerType === "COMPANY") return "company";
  if (user.partnerType === "MASTER") return "specialist";
  return "";
}

export function partnerDisplayTitle(
  partnership: Partnership,
  meId: string,
): { official: string; alias: string | null } {
  const partner = partnershipPartnerUser(partnership, meId);
  const official = partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
  const alias = partnership.listPreference?.personalAlias?.trim() || null;
  return { official, alias };
}

export function matchesListPartnerType(
  user: PartnershipPartnerProfile,
  filter: AgentPartnerTypeFilter,
): boolean {
  if (!filter) return true;
  return resolvePublicPartnerType(user) === filter;
}

export function matchesListSpecialization(
  user: PartnershipPartnerProfile,
  specialization: string,
): boolean {
  if (!specialization) return true;
  const [group, id] = specialization.split(":");
  if (!id) return true;
  const products = user.workingProductCategoryIds?.length
    ? user.workingProductCategoryIds
    : user.storeCategories;
  const services = user.workingServiceSpecializationIds?.length
    ? user.workingServiceSpecializationIds
    : user.specializations;
  if (group === "products") return products.includes(id);
  if (group === "services") return services.includes(id);
  return true;
}

export function matchesListStage(user: PartnershipPartnerProfile, stageId: string): boolean {
  if (!stageId) return true;
  const stages = user.workingNavigatorStageIds ?? [];
  return stages.includes(stageId);
}

/** Public share card: no contract terms, alias, notes, or financial data. */
export function buildPartnerShareText(partnership: Partnership, meId: string): string {
  const partner = partnershipPartnerUser(partnership, meId);
  const title = partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
  const city = partner.city?.trim() ? `Город: ${partner.city.trim()}` : "";
  const typeLabel = resolvePublicPartnerType(partner);
  const type =
    typeLabel === "store"
      ? "Тип: магазин"
      : typeLabel === "specialist"
        ? "Тип: специалист"
        : typeLabel === "company"
          ? "Тип: компания"
          : typeLabel === "agent"
            ? "Тип: агент"
            : "";
  return [title, city, type].filter(Boolean).join("\n");
}

export function sortPartnershipsDeterministic(rows: Partnership[]): Partnership[] {
  return [...rows].sort((a, b) => {
    const byTime = b.updatedAt.localeCompare(a.updatedAt);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}
