export type PurchaseDirection = "accepted" | "issued";

/** issued-order: pro issuer view; accepted-order: store order history; accepted-bonus: legacy bonus-list row */
export type PurchaseSource = "issued-order" | "accepted-order" | "accepted-bonus";

export type WalletRole = "AGENT" | "STORE" | "MASTER";

/** earned: user's rewards; payable-to-pros: store owes pros; unknown: API role missing */
export type AccrualScope = "earned" | "payable-to-pros" | "unknown";

export type AccrualType = "bonus" | "agentBonus";

export type LinkedAccrualRef = {
  id: string;
  type: AccrualType;
};

export type PurchaseRow = {
  id: string;
  source: PurchaseSource;
  orderId: string | null;
  bonusId: string | null;
  createdAt: string;
  promoCode: string | null;
  partnerName: string;
  direction: PurchaseDirection;
  totalAmount: number;
  discountAmount: number;
  payableAmount: number;
  orderStatus: string | null;
  bonusStatus: string | null;
  isSelfScan: boolean;
  clientName: string | null;
  branchName: string | null;
  executorName: string | null;
  proBonus: number | null;
  /** Typed links confirmed by schema (bonus / agentBonus). */
  linkedAccruals: LinkedAccrualRef[];
  /** Legacy flat ids — kept for backward compatibility. */
  linkedAccrualIds: string[];
  items: PurchaseItemRow[];
};

export type StoreOrdersResponse = {
  orders: Array<{
    orderId: string;
    createdAt: string;
    status: string;
    totalAmount: number;
    discountAmount: number;
    payableAmount: number;
    isSelfScan: boolean;
    promoCode: string | null;
    clientName: string | null;
    proName: string | null;
    storeName: string | null;
    branchId: string | null;
    branchName: string | null;
    branchCity: string | null;
    executorUserId: string;
    executorName: string | null;
    proBonus: number;
    linkedAccruals: Array<{ id: string; type: "bonus" }>;
  }>;
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
};

export type StoreOrderDetailResponse = {
  order: StoreOrdersResponse["orders"][number] & {
    items: Array<{
      id: string;
      category: string;
      categoryLabel: string;
      amount: number;
      discountPercent: number;
      discountAmount: number;
      issuerPercent: number;
      issuerAmount: number;
    }>;
  };
};

export type ProOrderDetailResponse = {
  order: {
    orderId: string;
    createdAt: string;
    status: string;
    totalAmount: number;
    discountAmount: number;
    payableAmount: number;
    isSelfScan: boolean;
    promoCode: string;
    clientName: string;
    storeName: string;
    branchId: string | null;
    branchName: string | null;
    branchCity: string | null;
    proBonus: number;
    linkedAccruals: Array<{ id: string; type: "bonus" | "agentBonus" }>;
    items: Array<{
      id: string;
      category: string;
      categoryLabel: string;
      amount: number;
      discountPercent: number;
      discountAmount: number;
      issuerPercent: number;
      issuerAmount: number;
    }>;
  };
};

export type PurchaseItemRow = {
  categoryLabel: string;
  amount: number;
  discountPercent?: number;
  issuerPercent?: number;
  issuerAmount?: number;
};

export type AccrualRow = {
  id: string;
  orderId: string | null;
  accrualType: AccrualType;
  createdAt: string;
  amount: number;
  status: string;
  paidAt: string | null;
  counterpartyName: string;
  promoCode: string | null;
  isSelfScan: boolean;
  walletRole: WalletRole | null;
  scope: AccrualScope;
  items: AccrualItemRow[];
};

export type WalletBalanceResponse = {
  role: WalletRole;
  pendingRub: number;
  paidRub: number;
  totalRub: number;
  count: number;
};

export type AccrualItemRow = {
  categoryLabel: string;
  amount: number;
  bonusPercent: number;
  bonusAmount: number;
};

export type HistoryFilters = {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  direction: "all" | PurchaseDirection;
};

export type StoreBonusListResponse = {
  totalPaid: number;
  totalPending: number;
  bonuses: Array<{
    id: string;
    amount: number;
    status: string;
    paidAt: string | null;
    payoutMethod: string | null;
    createdAt: string;
    proName: string;
    clientName: string;
    totalAmount: number;
    discountAmount: number;
    promoCode: string | null;
    orderId?: string | null;
    certificatePartner: { storeName: string; isSelfScan: boolean } | null;
    orderItems: Array<{
      categoryLabel: string;
      amount: number;
      issuerPercent: number;
      issuerAmount: number;
    }>;
  }>;
};

export type ProOrdersResponse = {
  orders: Array<{
    id: string;
    createdAt: string;
    clientName: string;
    totalAmount: number;
    discountAmount: number;
    proBonus: number;
    status: string;
    storeName: string;
    branchName: string | null;
    promoCode: string;
  }>;
};

export type WalletTransactionsResponse = {
  transactions: Array<{
    id: string;
    orderId?: string | null;
    accrualType?: AccrualType;
    amount: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
    payoutMethod: string | null;
    counterpartyName: string;
    promoCode: string | null;
    isSelfScan: boolean;
    canPayout?: boolean;
    items: Array<{
      categoryLabel: string;
      bonusPercent: number;
      amount: number;
      bonusAmount: number;
    }>;
  }>;
};
