import { displayCategoryLabel } from "@/lib/category-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { catalogEntityForProfile } from "@/lib/profile-catalog-state";

const GENERIC = "Партнёр RemCard";
const DEFAULT_NAME = "Пользователь";

export type CatalogPreviewModel = {
  publicName: string;
  city: string;
  description: string;
  productLabels: string[];
  serviceLabels: string[];
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
    const name = draft.organizationName.trim();
    if (name && name !== GENERIC) return name;
    const city = draft.city.trim();
    if (city) return `Партнёр в ${city}`;
    return GENERIC;
  }
  if (draft.showFullName) {
    const dn = (draft.catalogPublicName || draft.displayName).trim();
    if (dn && dn !== DEFAULT_NAME && dn !== GENERIC) return dn;
  }
  const city = draft.city.trim();
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
  const productLabels = draft.storeCategories.map((id) => displayCategoryLabel(id));
  const serviceLabels = draft.specializations.map((id) => masterDirectionLabel(id));
  const categoriesForAvatar =
    draft.storeCategories.length > 0 ? draft.storeCategories : draft.specializations;

  return {
    publicName: catalogPublicTitle(draft, profile),
    city: (draft.catalogCity || draft.city).trim() || profile.user.catalogCity || profile.user.city || "",
    description: draft.description.trim(),
    productLabels,
    serviceLabels,
    imageUrl: draft.catalogImageUrl.trim() || null,
    categoriesForAvatar,
    partnerType,
    website: draft.website.trim(),
    telegram: draft.telegram.trim(),
    publicEmail: draft.publicEmail.trim(),
    publicPhone: draft.publicPhone.trim(),
    showFullName: draft.showFullName,
  };
}
