export type AgentR03Status = {
  contractVersion: string;
  featureEnabled: boolean;
  hasAgentActivity: boolean;
  eligible: boolean;
  userId: string;
  ineligibleReason?: string | null;
};

export type AgentClientRow = {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  need: string | null;
  note: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  certificateCount: number;
  /** True when a linked certificate has confirmed usage/orders; false when none. */
  hasPurchases?: boolean;
};

export type AgentCertificatePartnerOffer = {
  storeName: string;
  categories: Array<{
    categoryLabel: string;
    discountPercent: number;
    agentBonusPercent?: number | null;
  }>;
};

export type AgentCertificateTermLine = {
  partnerName: string;
  categoryName: string;
  discountPercent: number;
  agentBonusPercent?: number | null;
};

export type AgentCertificateRow = {
  id: string;
  promoCode: string;
  displayCode: string;
  qrCode: string;
  status: string;
  validUntil: string | null;
  maxUsages: number;
  usageCount: number;
  createdAt: string;
  certificateUrl?: string | null;
  userAlias: string | null;
  title: string;
  directionLabel: string | null;
  partnerStoreName: string | null;
  partnerCount: number;
  categorySummary: string | null;
  partnerOffers?: AgentCertificatePartnerOffer[];
  terms?: AgentCertificateTermLine[];
  issuerDisplayName?: string | null;
  discountPercent: number;
  archivedInWorkspace: boolean;
  hasOrders: boolean;
  agentClient: { id: string; displayName: string } | null;
  issuerKindSnapshot: string | null;
};

export type AgentR03ListMeta = {
  page: number | null;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  activeCount: number;
  archivedCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  sort?: string;
};

export type AgentR03ListSort = 'updated_desc' | 'name_asc' | 'name_desc' | 'created_desc';

export type AgentClientPurchaseRow = {
  id: string;
  createdAt: string;
  status: string;
  statusLabel?: string;
  countsAsPurchase?: boolean;
  totalAmount: number;
  partnerName: string;
  certificateId: string;
  lineSummary: string | null;
};

export type AgentClientDetailResponse = {
  client: AgentClientRow & {
    purchaseCount?: number;
    lastCertificateAt?: string | null;
  };
  certificates: AgentCertificateRow[];
  purchases?: AgentClientPurchaseRow[];
};
