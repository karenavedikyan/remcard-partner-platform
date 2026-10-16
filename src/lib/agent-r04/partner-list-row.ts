import { displayCategoryLabel } from "@/lib/category-display";
import {
  matchesListSpecialization,
  partnershipPartnerUser,
  partnerDisplayTitle,
  resolvePublicPartnerType,
  type PartnershipPartnerProfile,
} from "@/lib/agent-r04/partner-filters";
import type { Partnership } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  store: "Магазин",
  specialist: "Специалист",
  company: "Компания",
  agent: "Агент",
};

export function partnerTypeLabel(user: PartnershipPartnerProfile): string {
  const t = resolvePublicPartnerType(user);
  return t ? TYPE_LABELS[t] ?? t : "Партнёр";
}

export function partnerSpecializationHint(user: PartnershipPartnerProfile): string {
  const products = user.workingProductCategoryIds?.length
    ? user.workingProductCategoryIds
    : user.storeCategories;
  const services = user.workingServiceSpecializationIds?.length
    ? user.workingServiceSpecializationIds
    : user.specializations;
  const parts: string[] = [];
  if (products?.length) parts.push(`Товары: ${products.slice(0, 2).join(", ")}`);
  if (services?.length) parts.push(`Услуги: ${services.slice(0, 2).join(", ")}`);
  return parts.join(" · ");
}

export function partnerListSubtitle(partner: PartnershipPartnerProfile): string {
  const city = partner.city?.trim() || "Город не указан";
  const type = partnerTypeLabel(partner);
  const spec = partnerSpecializationHint(partner);
  return [type, city, spec].filter(Boolean).join(" · ");
}

export function partnerListDetail(partnership: Partnership, meId: string): string {
  const activeTerms = partnership.terms.filter((t) => !t.isExcluded);
  if (!activeTerms.length) return "Условия не указаны";
  return activeTerms
    .slice(0, 3)
    .map((t) => `${displayCategoryLabel(t.category, t.categoryLabel)} ${t.storePercent}%`)
    .join(" · ");
}

export function partnerRowTitle(partnership: Partnership, meId: string): string {
  const { alias, official } = partnerDisplayTitle(partnership, meId);
  return alias ?? official;
}

export function partnerRowOfficialLine(partnership: Partnership, meId: string): string | null {
  const { alias, official } = partnerDisplayTitle(partnership, meId);
  return alias ? official : null;
}

export function partnershipPartnerProfile(partnership: Partnership, meId: string) {
  return partnershipPartnerUser(partnership, meId);
}
