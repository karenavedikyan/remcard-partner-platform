export type PreviewCategory = {
  category: string;
  categoryLabel: string;
  discountPercent: number;
  issuerPercent: number;
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
  certificate: {
    id: string;
    promoCode: string;
    status: string;
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
  };
  partner: {
    id: string;
    storeName: string;
    isSelfScan: boolean;
  };
  availableCategories: PreviewCategory[];
  /** Present on newer backend; absent on older deployments. */
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
