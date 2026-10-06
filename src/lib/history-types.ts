export type PurchaseDirection = "accepted" | "issued";

export type PurchaseRow = {
  id: string;
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
  proBonus: number | null;
  items: PurchaseItemRow[];
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
  createdAt: string;
  amount: number;
  status: string;
  paidAt: string | null;
  counterpartyName: string;
  promoCode: string | null;
  isSelfScan: boolean;
  orderId: string | null;
  items: AccrualItemRow[];
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
    amount: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
    payoutMethod: string | null;
    counterpartyName: string;
    promoCode: string | null;
    isSelfScan: boolean;
    items: Array<{
      categoryLabel: string;
      bonusPercent: number;
      amount: number;
      bonusAmount: number;
    }>;
  }>;
};
