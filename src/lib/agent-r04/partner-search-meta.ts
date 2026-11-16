import { PARTNER_KIND_UI_LABELS, resolvePartnerKindUi, type PartnerKindUi } from "@/lib/partner-kind-ui";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import { partnerTypeLabel, partnerSpecializationHint } from "@/lib/agent-r04/partner-list-row";
import type { PartnerSearchResult } from "@/lib/types";
import type { PartnershipPartnerProfile } from "@/lib/agent-r04/partner-filters";

/**
 * Canonical public role of a search result. Only decided when the API sent the activities:
 * a missing list is unknown, never «no activities», and nothing is inferred from receiving ability.
 */
export function searchResultPublicKind(partner: PartnerSearchResult): PartnerKindUi | null {
  if (!Array.isArray(partner.partnerActivities)) return null;
  return resolvePartnerKindUi({
    partnerType: partner.partnerType ?? null,
    partnerActivities: partner.partnerActivities,
  });
}

function labelsFromApi(partner: PartnerSearchResult): string[] {
  const fromApi = [
    ...(partner.workingProductLabels ?? []),
    ...(partner.workingServiceLabels ?? []),
    ...(partner.workingStageLabels ?? []),
  ].filter(Boolean);
  if (fromApi.length) return fromApi;
  return [];
}

export function partnerSearchResultMeta(partner: PartnerSearchResult): string[] {
  const lines: string[] = [];
  const kind = searchResultPublicKind(partner);
  const type =
    (kind ? PARTNER_KIND_UI_LABELS[kind] : "") ||
    partner.partnerTypeLabel?.trim() ||
    (partner.partnerType === "STORE"
      ? "Магазин"
      : partner.partnerType === "COMPANY"
        ? "Компания"
        : partner.partnerType === "MASTER"
          ? "Специалист"
          : "");
  if (type) lines.push(type);
  if (partner.city?.trim()) lines.push(partner.city.trim());

  const apiLabels = labelsFromApi(partner);
  if (apiLabels.length) {
    lines.push(`Специализация: ${apiLabels.slice(0, 3).join(", ")}`);
    return lines;
  }

  const asProfile = {
    id: partner.id,
    displayName: partner.displayName,
    partnerType: partner.partnerType ?? partner.organizationPartnerType ?? undefined,
    city: partner.city,
    storeCategories: partner.storeCategories,
    specializations: partner.specializations,
    workingProductCategoryIds: partner.productCategoryIds,
    workingServiceSpecializationIds: partner.serviceSpecializationIds,
    workingNavigatorStageIds: partner.navigatorStageIds,
  } as PartnershipPartnerProfile;

  const spec = partnerSpecializationHint(asProfile);
  if (spec) lines.push(`Специализация: ${spec}`);

  const stages = (partner.navigatorStageIds ?? [])
    .map((id) => masterDirectionLabel(id))
    .filter((l) => l !== "Категория");
  if (stages.length) lines.push(`Этапы: ${stages.slice(0, 3).join(", ")}`);

  return lines;
}
