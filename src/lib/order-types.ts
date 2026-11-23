import type { CertificatePartnerRecipientPolicy } from "@/lib/certificate-types";

export type PreviewCategory = {
  category: string;
  categoryLabel: string;
  discountPercent: number;
  issuerPercent: number;
  proBonusPercent?: number;
  /** Server-authoritative max client discount % when present (live partnership or frozen pool). */
  maxClientDiscountPercent?: number;
};

/** Creator/recommender (certificate proUser), not issuer org or redeeming store. */
export type OrderPreviewReferringPartnerContact = {
  kind: string;
  label: string;
  value: string;
  href: string;
};

export type OrderPreviewReferringPartner = {
  partnerType: string | null;
  typeLabel: string;
  displayName: string;
  city: string | null;
  contacts: OrderPreviewReferringPartnerContact[];
};

export type OrderPreviewAllowed = {
  allowed: true;
  /** Totals from `availableCategories` are provisional until order confirm. */
  previewProvisional?: boolean;
  certificate: {
    id: string;
    promoCode: string;
    status: string;
    createdAt?: string;
    validUntil: string | null;
    usageCount: number;
    maxUsages: number;
    userAlias: string | null;
    issuer: { label: string; name: string };
    partnerCards?: Array<{
      publicName?: string;
      city?: string | null;
      categories?: Array<{ categoryLabel: string; discountPercent: number }>;
    }>;
    recipientPolicy?: CertificatePartnerRecipientPolicy | null;
  };
  partner: {
    id: string;
    storeUserId: string;
    storeName: string;
    isSelfScan: boolean;
    recipientPolicy?: CertificatePartnerRecipientPolicy | null;
  };
  availableCategories: PreviewCategory[];
  referringPartner?: OrderPreviewReferringPartner | null;
};

export type OrderPreviewDenied = {
  allowed: false;
  message: string;
  certificate?: {
    promoCode?: string;
    status?: string;
  };
};

export type OrderPreviewResponse = OrderPreviewAllowed | OrderPreviewDenied;

export type OrderCreateItem = {
  rewardConfirmation?: import("@/lib/reward-confirmation").RewardConfirmation;
  category: string;
  categoryLabel: string;
  amount: number;
};

export type OrderCreateBody = {
  certificateCode: string;
  items: OrderCreateItem[];
};

export type OrderCreateResponse = {
  order: { id: string; status?: string };
  message?: string;
  summary: {
    totalAmount: number;
    discountAmount: number;
    issuerBonusAmount?: number;
    proBonusAmount?: number;
    isSelfScan: boolean;
  };
};