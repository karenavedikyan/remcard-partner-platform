import { displayCategoryLabel } from "@/lib/category-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import {
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

function labelSpecializationId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return "";
  const fromMaster = masterDirectionLabel(trimmed);
  if (fromMaster !== "Категория") return fromMaster;
  const fromCategory = displayCategoryLabel(trimmed, "");
  return fromCategory && fromCategory !== "Категория" ? fromCategory : "";
}

export function partnerSpecializationHint(user: PartnershipPartnerProfile): string {
  const products = user.workingProductCategoryIds?.length
    ? user.workingProductCategoryIds
    : user.storeCategories;
  const services = user.workingServiceSpecializationIds?.length
    ? user.workingServiceSpecializationIds
    : user.specializations;
  const labels: string[] = [];
  for (const id of products ?? []) {
    const label = labelSpecializationId(id);
    if (label) labels.push(label);
  }
  for (const id of services ?? []) {
    const label = labelSpecializationId(id);
    if (label) labels.push(label);
  }
  return [...new Set(labels)].slice(0, 3).join(", ");
}

export function partnerListSubtitle(partner: PartnershipPartnerProfile): string {
  const city = partner.city?.trim() || "Город не указан";
  const type = partnerTypeLabel(partner);
  return `${type} · ${city}`;
}

export function partnerListDetail(partnership: Partnership, meId: string): string {
  const partner = partnershipPartnerUser(partnership, meId);
  const spec = partnerSpecializationHint(partner);
  const city = partner.city?.trim();
  if (spec && city) return `${city} · ${spec}`;
  if (spec) return spec;
  if (city) return city;
  return "Специализация не указана";
}

export function partnerTermsDetail(partnership: Partnership): string {
  const activeTerms = partnership.terms.filter((t) => !t.isExcluded);
  if (!activeTerms.length) return "";
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
