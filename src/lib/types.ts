export type AuthUser = {
  id: string;
  publicId?: string;
  displayName?: string | null;
  role?: string;
  city?: string | null;
  partnerType?: string | null;
  partnerActivities?: string[];
  catalogStatus?: string | null;
  isBlocked?: boolean;
  staffRole?: string | null;
  isProfTestUser?: boolean;
};

export type ProfTestSessionInfo = {
  active: boolean;
  displayName: string;
  partnerType?: string | null;
  partnerActivities?: string[];
};

export type AuthMeResponse = {
  user: AuthUser | null;
  profTestSession?: ProfTestSessionInfo | null;
};

export type ProProfileUser = {
  id: string;
  publicId: string;
  displayName: string | null;
  city: string | null;
  partnerActivities?: string[];
  catalogDisplayName?: string | null;
  catalogDisplayNameSource?: "staged_draft" | "live_public" | "working_profile";
  catalogCity?: string | null;
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
  catalogDraft?: unknown;
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
    logoUrl?: string | null;
    catalogStatus: string;
    catalogPublished?: boolean;
    catalogDraft?: unknown;
    catalogDraftPending?: boolean;
    description?: string | null;
    website?: string | null;
    storeCategories?: string[];
    specializations?: string[];
    telegram?: string | null;
    publicEmail?: string | null;
    publicPhone?: string | null;
    partnerType: string | null;
    branchCount: number;
    /** Primary branch for public catalog geography (GET /api/pro/profile). */
    publicCatalogBranchId?: string | null;
    publicCatalogCity?: string | null;
    /** Org catalog renovation stages (effective draft overlay on GET). */
    publicNavigatorStageIds?: string[];
    /** Live approved stages (GET /api/pro/profile); absent on older API builds. */
    catalogNavigatorStageIdsLive?: string[];
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
  partnerActivities?: string[];
  workingProductCategoryIds?: string[];
  workingServiceSpecializationIds?: string[];
  workingNavigatorStageIds?: string[];
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
  listPreference?: {
    personalAlias: string | null;
    archivedAt: string | null;
    hiddenAt?: string | null;
  } | null;
};

export type PartnershipListResponse = {
  partnerships: Partnership[];
  listCounts?: {
    active: number;
    archive: number;
    hidden: number;
  };
  listVisibility?: "active" | "archive" | "hidden" | "all";
};

export type PartnerPublishedTerm = {
  category: string;
  categoryLabel?: string;
  /** Общий процент (pool): скидка клиенту + бонус; не гарантированный доход. */
  poolPercent: number;
  /** Alias for invite mapping — same as poolPercent when provided by search. */
  storePercent?: number;
  isExcluded?: boolean;
};

export type PartnerSearchFacets = {
  total: number;
  stages: Record<string, number>;
  products: Record<string, number>;
  services: Record<string, number>;
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
  partnerActivities?: string[] | null;
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
  /** Additive: published certificate-program terms when search includes them. */
  publishedTerms?: PartnerPublishedTerm[];
};

export type PartnerSearchResponse = {
  partners: PartnerSearchResult[];
  nextCursor?: string | null;
  hasMore?: boolean;
  /** Additive full matching-set facets (absent ≠ zeros). */
  facets?: PartnerSearchFacets | null;
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
