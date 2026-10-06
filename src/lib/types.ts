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
};

export type ProProfileResponse = {
  organization: {
    id: string;
    name: string;
    catalogStatus: string;
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
  /** Подтверждённый partnerType организации владельца (если API поиска когда‑либо вернёт). */
  organizationPartnerType?: string | null;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  branches: { address: string; city: string }[];
  rating: number | null;
  ratingCount: number;
  partnershipStatus: string | null;
  isPublic?: boolean | null;
};

export type PartnerSearchResponse = {
  partners: PartnerSearchResult[];
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
