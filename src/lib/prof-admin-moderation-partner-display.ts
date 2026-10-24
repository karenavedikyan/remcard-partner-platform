import { displayCategoryLabel } from "@/lib/category-display";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import {
  moderationCatalogStatusLabel,
  moderationSubmittedStageLabels,
  moderationSubmittedString,
  partnerTypeLabel,
} from "@/lib/prof-admin-moderation-org-display";

function moderationStringIds(ids: string[] | undefined): string[] {
  return (ids ?? []).filter((id): id is string => typeof id === "string");
}

export type ModerationPartnerSubmitted = {
  displayName?: string | null;
  city?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  specializations?: string[];
  storeCategories?: string[];
  website?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  vk?: string | null;
  max?: string | null;
  yandex?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  navigatorStageIds?: string[];
};

export type ModerationPartnerLive = {
  displayName?: string | null;
  city?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  isPublic?: boolean;
  storeCategories?: { key: string; label: string }[];
  specializations?: { key: string; label: string }[];
};

export type ModerationPartnerDetail = {
  id: string;
  publicId: string;
  partnerType: string | null;
  catalogStatus: string;
  isPublic: boolean;
  isTestPartner: boolean;
  profTestPublicCatalogAllowed: boolean | null;
  rejectionReason: string | null;
  hasSubmittedDiff: boolean;
  fieldDiffs?: string[];
  revisionToken: string;
  updatedAt?: string;
  submitted: ModerationPartnerSubmitted;
  live: ModerationPartnerLive;
  portfolioItems: { id: string; title: string | null; description: string | null; images: string[] }[];
  services: {
    id: string;
    title: string;
    description: string | null;
    itemKind: string;
    city: string;
    images: string[];
  }[];
  moderationNotes: { id: string; comment: string; createdAt: string; resolvedAt: string | null }[];
};

export function moderationPartnerSubmittedStageLabels(ids: string[] | undefined): string[] {
  return moderationSubmittedStageLabels(ids);
}

export {
  moderationCatalogStatusLabel,
  moderationSubmittedString,
  partnerTypeLabel,
};

export function moderationPartnerSubmittedCategoryLabels(partner: ModerationPartnerDetail): string[] {
  const s = partner.submitted;
  if (partner.partnerType === "MASTER") {
    return (s.specializations ?? []).map((k) => masterDirectionLabel(k) || displayCategoryLabel(k));
  }
  return (s.storeCategories ?? []).map((k) => displayCategoryLabel(k));
}

export function moderationPartnerChangeBlock(partner: ModerationPartnerDetail): string | null {
  if (!partner.hasSubmittedDiff) return "Изменений относительно опубликованной версии нет.";
  const fields = partner.fieldDiffs ?? [];
  if (fields.length === 0) return "Есть отличия отправленной заявки от текущей опубликованной версии.";
  return `Изменённые поля: ${fields.join(", ")}`;
}

export function moderationPartnerPublicVisibility(partner: ModerationPartnerDetail): {
  livePublic: boolean;
  testOptIn: boolean | null;
} {
  return {
    livePublic: Boolean(partner.live.isPublic),
    testOptIn: partner.isTestPartner ? partner.profTestPublicCatalogAllowed : null,
  };
}

export function buildModerationPartnerCatalogPreviewInput(partner: ModerationPartnerDetail): {
  profile: ProProfileResponse;
  draft: ProfileDraft;
} {
  const s = partner.submitted;
  const city = moderationSubmittedString(s.city);
  const displayName = moderationSubmittedString(s.displayName) || partner.publicId;
  const draft: ProfileDraft = {
    displayName,
    catalogCity: city,
    city,
    description: moderationSubmittedString(s.description),
    partnerType: partner.partnerType ?? "MASTER",
    specializations: moderationStringIds(s.specializations),
    storeCategories: moderationStringIds(s.storeCategories),
    organizationName: "",
    branchAddress: "",
    website: moderationSubmittedString(s.website),
    telegram: moderationSubmittedString(s.telegram),
    publicEmail: moderationSubmittedString(s.publicEmail),
    publicPhone: moderationSubmittedString(s.publicPhone),
    catalogPublicName: displayName,
    showFullName: false,
    catalogImageUrl: moderationSubmittedString(s.photoUrl),
    productCategoryIds: [],
    serviceSpecializationIds: [],
    navigatorStageIds: moderationStringIds(s.navigatorStageIds),
    primaryDirection: null,
    partnerSearchOptIn: false,
    partnerWorkMode: "",
    areas: [],
    partnershipContactName: "",
    partnershipContactPhone: "",
    partnershipContactEmail: "",
    partnerActivities: [],
  };

  const profile = {
    user: {
      partnerType: partner.partnerType,
      displayName,
      city,
      photoUrl: s.photoUrl ?? null,
    },
  } as ProProfileResponse;

  return { profile, draft };
}

export { formatPhoneForDisplay as moderationFormatPublicPhone };

const PARTNER_ITEM_KIND_RU: Record<string, string> = {
  SERVICE: "Услуга",
  PRODUCT: "Товар",
  PROMOTION: "Акция",
};

export function moderationPartnerItemKindLabel(itemKind: string): string {
  return PARTNER_ITEM_KIND_RU[itemKind] ?? itemKind;
}
