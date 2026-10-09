export type AuthUser = {
  id: string;
  publicId?: string;
  displayName?: string | null;
  role?: string;
  city?: string | null;
  partnerType?: string | null;
  catalogStatus?: string | null;
  isBlocked?: boolean;
};

export type AuthMeResponse = {
  user: AuthUser | null;
};

export type ProProfileUser = {
  id: string;
  publicId: string;
  displayName: string | null;
  city: string | null;
  specializations: string[];
  role: string;
  partnerType: string | null;
  description: string | null;
  catalogStatus: string;
  isPublic: boolean;
  rejectionReason: string | null;
  badges: string[];
  photoUrl: string | null;
  storeCategories: string[];
  areas: string[];
  website: string | null;
  telegram: string | null;
  whatsapp: string | null;
  instagram: string | null;
  vk: string | null;
  max: string | null;
  yandex: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  showFullName: boolean;
  catalogDraftPending?: boolean;
  telegramLinked?: boolean;
  maxLinked?: boolean;
  notificationSettings?: unknown;
};

export type WorkingPrimaryDirection = { kind: "product" | "service"; id: string } | null;

export type WorkingProfileDto = {
  productCategoryIds: string[];
  serviceSpecializationIds: string[];
  navigatorStageIds: string[];
  primaryDirection: WorkingPrimaryDirection;
  effectiveProductCategoryIds: string[];
  effectiveServiceSpecializationIds: string[];
  effectiveNavigatorStageIds?: string[];
  partnerSearchVisible: boolean;
  partnerSearchOptIn: boolean;
  partnerSearchOptInExplicit: boolean;
  workingDirectionsTouched: boolean;
  partnerWorkMode: string | null;
  areas: string[];
  partnershipContactName: string | null;
  partnershipContactPhone: string | null;
  partnershipContactEmail: string | null;
};

export type PartnerTaxonomyItem = {
  kind: "product" | "service" | "stage";
  id: string;
  label: string;
};

export type PartnerTaxonomyResponse = {
  products: PartnerTaxonomyItem[];
  services: PartnerTaxonomyItem[];
  stages: PartnerTaxonomyItem[];
};

export type ProProfileResponse = {
  workingProfile?: WorkingProfileDto;
  catalogPublication?: {
    catalogEntity?: "user" | "organization";
    organizationId?: string;
    isLivePublic: boolean;
    draftPending: boolean;
    published: {
      description: string | null;
      specializations: string[];
      storeCategories: string[];
      website: string | null;
      telegram: string | null;
      publicEmail: string | null;
      publicPhone: string | null;
      showFullName?: boolean;
    };
  };
  organization: {
    id: string;
    name: string;
    catalogStatus: string;
    catalogPublished?: boolean;
    catalogDraft?: unknown;
    catalogDraftPending?: boolean;
    description?: string | null;
    website?: string | null;
    storeCategories?: string[];
    partnerType: string | null;
    branchCount: number;
  } | null;
  user: ProProfileUser;
  programs: Array<{ code: string; enabled: boolean }>;
};

export type PartnershipTerm = {
  id: string;
  category: string;
  categoryLabel: string;
  storePercent: number;
  isExcluded: boolean;
  minMargin: number | null;
};

export type PartnershipUser = {
  id: string;
  displayName: string | null;
  photoUrl?: string | null;
  city: string | null;
  specializations: string[];
  storeCategories: string[];
  partnerType: string | null;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
};

export type Partnership = {
  id: string;
  status: string;
  initiatedBy: string;
  pendingProposedBy?: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  storeUserId: string;
  proUserId: string;
  terms: PartnershipTerm[];
  storeUser: PartnershipUser;
  proUser: PartnershipUser;
};

export type PartnershipListResponse = {
  partnerships: Partnership[];
};

export type PartnerSearchResult = {
  id: string;
  displayName: string;
  city: string | null;
  photoUrl: string | null;
  description: string | null;
  specializations: string[];
  badges: string[];
  storeCategories: string[];
  partnerType?: string | null;
  partnerTypeLabel?: string | null;
  /** Подтверждённый partnerType организации владельца (если API поиска когда‑либо вернёт). */
  organizationPartnerType?: string | null;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  branches: { address: string; city: string }[];
  rating: number | null;
  ratingCount: number;
  partnershipStatus: string | null;
  isPublic?: boolean | null;
  productCategoryIds?: string[];
  serviceSpecializationIds?: string[];
  navigatorStageIds?: string[];
  workingProductLabels?: string[];
  workingServiceLabels?: string[];
  workingStageLabels?: string[];
  partnershipContact?: {
    name: string | null;
    phone: string | null;
    email: string | null;
  };
};

export type PartnerSearchResponse = {
  partners: PartnerSearchResult[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

export type TermChangeRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  requestedBy: string;
  changes: unknown;
  rejectionReason: string | null;
  expiresAt: string;
  createdAt: string;
};

export type TermChangePayload = {
  category: string;
  newPercent: number;
};

export type InviteTermInput = {
  category: string;
  categoryLabel?: string;
  storePercent: number;
  minMargin?: number;
  isExcluded?: boolean;
};
