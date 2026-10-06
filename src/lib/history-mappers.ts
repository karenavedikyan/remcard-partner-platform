import type {
  AccrualRow,
  ProOrdersResponse,
  PurchaseRow,
  StoreBonusListResponse,
  WalletTransactionsResponse,
} from "./history-types";

export function mapStoreBonusListToPurchases(data: StoreBonusListResponse): PurchaseRow[] {
  return data.bonuses.map((bonus) => ({
    id: bonus.id,
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

export function mapWalletTransactionsToAccruals(data: WalletTransactionsResponse): AccrualRow[] {
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
      orderId: null,
      items: tx.items,
    }));
}

export function findPurchaseById(rows: PurchaseRow[], id: string): PurchaseRow | null {
  return rows.find((row) => row.id === id || row.orderId === id) ?? null;
}

/** Match a purchase row after scanner success when orderId is known but API may not expose it on store rows. */
export function findPurchaseByOrderHint(
  rows: PurchaseRow[],
  hint: { orderId?: string | null; promoCode?: string | null },
): PurchaseRow | null {
  const byId = hint.orderId ? findPurchaseById(rows, hint.orderId) : null;
  if (byId) {
    return byId;
  }
  if (hint.promoCode) {
    return rows.find((row) => row.promoCode === hint.promoCode) ?? null;
  }
  return null;
}

export function findAccrualById(rows: AccrualRow[], id: string): AccrualRow | null {
  return rows.find((row) => row.id === id) ?? null;
}

export function findAccrualsForPurchase(
  purchase: PurchaseRow,
  accruals: AccrualRow[],
): AccrualRow[] {
  if (purchase.isSelfScan) {
    return [];
  }
  return accruals.filter(
    (row) =>
      !row.isSelfScan &&
      (row.id === purchase.bonusId ||
        (purchase.promoCode && row.promoCode === purchase.promoCode)),
  );
}
