import type {
  AccrualRow,
  AccrualScope,
  ProOrdersResponse,
  PurchaseRow,
  StoreBonusListResponse,
  WalletRole,
  WalletTransactionsResponse,
} from "./history-types";

export function accrualScopeFromWalletRole(role: WalletRole | null): AccrualScope {
  if (role === "STORE") {
    return "payable-to-pros";
  }
  if (role === "AGENT" || role === "MASTER") {
    return "earned";
  }
  return "unknown";
}

export function mapStoreBonusListToPurchases(data: StoreBonusListResponse): PurchaseRow[] {
  return data.bonuses.map((bonus) => ({
    id: bonus.id,
    source: "accepted-bonus",
    orderId: null,
    bonusId: bonus.id,
    createdAt: new Date(bonus.createdAt).toISOString(),
    promoCode: bonus.promoCode,
    partnerName: bonus.proName,
    direction: "accepted",
    totalAmount: bonus.totalAmount,
    discountAmount: bonus.discountAmount,
    payableAmount: bonus.totalAmount - bonus.discountAmount,
    orderStatus: null,
    bonusStatus: bonus.status,
    isSelfScan: Boolean(bonus.certificatePartner?.isSelfScan),
    clientName: bonus.clientName,
    branchName: null,
    proBonus: bonus.amount,
    items: bonus.orderItems.map((item) => ({
      categoryLabel: item.categoryLabel,
      amount: item.amount,
      issuerPercent: item.issuerPercent,
      issuerAmount: item.issuerAmount,
    })),
  }));
}

export function mapProOrdersToPurchases(data: ProOrdersResponse): PurchaseRow[] {
  return data.orders.map((order) => ({
    id: order.id,
    source: "issued-order",
    orderId: order.id,
    bonusId: null,
    createdAt: order.createdAt,
    promoCode: order.promoCode,
    partnerName: order.storeName,
    direction: "issued",
    totalAmount: order.totalAmount,
    discountAmount: order.discountAmount,
    payableAmount: order.totalAmount - order.discountAmount,
    orderStatus: order.status,
    bonusStatus: null,
    isSelfScan: false,
    clientName: order.clientName,
    branchName: order.branchName,
    proBonus: order.proBonus,
    items: [],
  }));
}

export function mapWalletTransactionsToAccruals(
  data: WalletTransactionsResponse,
  walletRole: WalletRole | null,
): AccrualRow[] {
  const scope = accrualScopeFromWalletRole(walletRole);
  return data.transactions
    .filter((tx) => !tx.isSelfScan && tx.amount > 0)
    .map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      amount: tx.amount,
      status: tx.status,
      paidAt: tx.paidAt,
      counterpartyName: tx.counterpartyName,
      promoCode: tx.promoCode,
      isSelfScan: tx.isSelfScan,
      walletRole,
      scope,
      items: tx.items,
    }));
}
