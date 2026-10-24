import { displayCategoryLabel } from "@/lib/category-display";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import { ONBOARDING_STAGES } from "@/lib/onboarding-stages";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { catalogEntityForProfile } from "@/lib/profile-catalog-state";

const GENERIC = "Партнёр RemCard";
const DEFAULT_NAME = "Пользователь";

function draftField(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

export type CatalogPreviewModel = {
  publicName: string;
  city: string;
  description: string;
  productLabels: string[];
  serviceLabels: string[];
  stageLabels: string[];
  imageUrl: string | null;
  categoriesForAvatar: string[];
  partnerType: string;
  website: string;
  telegram: string;
  publicEmail: string;
  publicPhone: string;
  showFullName: boolean;
};

export function catalogPublicTitle(
  draft: ProfileDraft,
  profile: ProProfileResponse,
): string {
  const entity = catalogEntityForProfile(profile);
  if (entity === "organization") {
    const name = draftField(draft.organizationName).trim();
    if (name && name !== GENERIC) return name;
    const city = draftField(draft.city).trim();
    if (city) return `Партнёр в ${city}`;
    return GENERIC;
  }
  if (draft.showFullName) {
    const dn = draftField(draft.catalogPublicName || draft.displayName).trim();
    if (dn && dn !== DEFAULT_NAME && dn !== GENERIC) return dn;
  }
  const city = draftField(draft.city).trim();
  const pt = draft.partnerType;
  if (pt === "STORE" || pt === "COMPANY") {
    return city ? `Партнёр в ${city}` : GENERIC;
  }
  return city ? `Мастер в ${city}` : "Мастер RemCard";
}

export function buildCatalogPreviewModel(
  profile: ProProfileResponse,
  draft: ProfileDraft,
): CatalogPreviewModel {
  const partnerType = draft.partnerType || profile.user.partnerType || "MASTER";
  const productLabels = draft.storeCategories
    .filter((id): id is string => typeof id === "string")
    .map((id) => displayCategoryLabel(id));
  const serviceLabels = draft.specializations
    .filter((id): id is string => typeof id === "string")
    .map((id) => masterDirectionLabel(id));
  const stageLabels = draft.navigatorStageIds
    .filter((id): id is string => typeof id === "string")
    .map((id) => {
    const stage = ONBOARDING_STAGES.find((s) => s.id === id);
    return stage ? `${stage.icon} ${stage.title}` : masterDirectionLabel(id);
  });
  const categoriesForAvatar =
    draft.storeCategories.length > 0 ? draft.storeCategories : draft.specializations;
  const rawPhone = draftField(draft.publicPhone).trim();
  const displayPhone = rawPhone ? formatPhoneForDisplay(rawPhone) : "";

  return {
    publicName: catalogPublicTitle(draft, profile),
    city:
      draftField(draft.catalogCity || draft.city).trim() ||
      profile.user.catalogCity ||
      profile.user.city ||
      "",
    description: draftField(draft.description).trim(),
    productLabels,
    serviceLabels,
    stageLabels,
    imageUrl: draftField(draft.catalogImageUrl).trim() || null,
    categoriesForAvatar,
    partnerType,
    website: draftField(draft.website).trim(),
    telegram: draftField(draft.telegram).trim(),
    publicEmail: draftField(draft.publicEmail).trim(),
    publicPhone: displayPhone,
    showFullName: draft.showFullName,
  };
}
