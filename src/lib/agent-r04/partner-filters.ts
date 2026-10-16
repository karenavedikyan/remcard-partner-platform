import type { Partnership, PartnershipUser } from "@/lib/types";

export type AgentPartnerTypeFilter = "" | "agent" | "specialist" | "store" | "company";

export function partnershipPartnerUser(partnership: Partnership, meId: string): PartnershipUser {
  return partnership.storeUserId === meId ? partnership.proUser : partnership.storeUser;
}

export function resolvePublicPartnerType(user: PartnershipUser): AgentPartnerTypeFilter {
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
  user: PartnershipUser,
  filter: AgentPartnerTypeFilter,
): boolean {
  if (!filter) return true;
  if (filter === "agent") {
    return false;
  }
  return resolvePublicPartnerType(user) === filter;
}

export function matchesListSpecialization(
  user: PartnershipUser,
  specialization: string,
): boolean {
  if (!specialization) return true;
  const [group, id] = specialization.split(":");
  if (!id) return true;
  if (group === "products") {
    return user.storeCategories.includes(id);
  }
  if (group === "services") {
    return user.specializations.includes(id);
  }
  return true;
}

export function buildPartnerShareText(partnership: Partnership, meId: string): string {
  const partner = partnershipPartnerUser(partnership, meId);
  const title = partner.organizationName?.trim() || partner.displayName?.trim() || "Партнёр";
  const city = partner.city?.trim() ? `Город: ${partner.city.trim()}` : "";
  const type =
    partner.partnerType === "STORE"
      ? "Тип: магазин"
      : partner.partnerType === "MASTER"
        ? "Тип: специалист"
        : partner.partnerType === "COMPANY"
          ? "Тип: компания"
          : "";
  const activeTerms = partnership.terms.filter((t) => !t.isExcluded).slice(0, 3);
  const terms =
    activeTerms.length > 0
      ? `Условия (кратко): ${activeTerms.map((t) => `${t.categoryLabel} ${t.storePercent}%`).join("; ")}`
      : "";
  return [title, city, type, terms].filter(Boolean).join("\n");
}
