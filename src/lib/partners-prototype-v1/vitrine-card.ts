import type { PartnerSearchResult } from "@/lib/types";
import {
  adaptPartnerPrimaryKind,
  PARTNER_PRIMARY_KIND_LABELS,
  type PartnerPrimaryKindUi,
} from "./partner-kind-adapter";

export type PartnerVitrineCardModel = {
  id: string;
  title: string;
  kind: PartnerPrimaryKindUi | null;
  kindLabel: string;
  city: string;
  specializationLine: string;
  stagesLine: string;
  description: string | null;
  partnershipStatus: string | null;
  /** Do not show rating without confirmed API — rating may be null. */
  showRating: false;
};

export function buildVitrineCard(partner: PartnerSearchResult): PartnerVitrineCardModel {
  const kind = adaptPartnerPrimaryKind({
    partnerType: partner.partnerType,
    partnerActivities: partner.partnerActivities,
    organizationPartnerType: partner.organizationPartnerType,
  });

  const productLabels = partner.workingProductLabels?.length
    ? partner.workingProductLabels
    : partner.storeCategories ?? [];
  const serviceLabels = partner.workingServiceLabels?.length
    ? partner.workingServiceLabels
    : partner.specializations ?? [];
  const stageLabels = partner.workingStageLabels ?? [];

  const specializationParts = [...serviceLabels, ...productLabels].filter(Boolean);
  const specializationLine = specializationParts.length
    ? specializationParts.slice(0, 6).join(", ") +
      (specializationParts.length > 6 ? ` и ещё ${specializationParts.length - 6}` : "")
    : "Специализация не указана";

  const stagesLine = stageLabels.length
    ? `Этапы: ${stageLabels.slice(0, 3).join(", ")}${
        stageLabels.length > 3 ? ` и ещё ${stageLabels.length - 3}` : ""
      }`
    : "";

  return {
    id: partner.id,
    title:
      partner.organizationName?.trim() ||
      partner.displayName?.trim() ||
      "Партнёр",
    kind,
    kindLabel: kind ? PARTNER_PRIMARY_KIND_LABELS[kind] : partner.partnerTypeLabel?.trim() || "Партнёр",
    city: partner.city?.trim() || "Город не указан",
    specializationLine,
    stagesLine,
    description: partner.description?.trim() || null,
    partnershipStatus: partner.partnershipStatus,
    showRating: false,
  };
}
